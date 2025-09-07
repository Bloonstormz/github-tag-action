import * as core from '@actions/core';
import { analyzeCommits } from '@semantic-release/commit-analyzer';
import { generateNotes } from '@semantic-release/release-notes-generator';
import {
  diff,
  gte,
  inc,
  parse,
  prerelease,
  ReleaseType,
  SemVer,
  valid,
} from 'semver';
import { createTag } from './github';
import { Await } from './ts';
import {
  getBranchFromRef,
  getCommits,
  getLatestPrereleaseTag,
  getLatestTag,
  getValidTags,
  mapCustomReleaseRules,
  mergeWithDefaultChangelogRules,
} from './utils';

export default async function main() {
  const defaultBump = core.getInput('default_bump') as ReleaseType | 'false';
  const default_isPreRelease = /true/i.test(core.getInput('is_pre_release'));
  const default_preReleaseIdentifier =
    core.getInput('pre_release_identifier') || 'rc';
  const tagPrefix = core.getInput('tag_prefix');
  const customTag = core.getInput('custom_tag');
  const applyPrefixToCustomTag = /true/i.test(
    core.getInput('apply_prefix_to_custom_tag')
  );
  const releaseBranches = core.getInput('release_branches');
  const createAnnotatedTag = /true/i.test(
    core.getInput('create_annotated_tag')
  );
  const dryRun = core.getInput('dry_run');
  const customReleaseRules = core.getInput('custom_release_rules');
  const shouldFetchAllTags = core.getInput('fetch_all_tags');
  const commitSha = core.getInput('commit_sha');

  let mappedReleaseRules;
  if (customReleaseRules) {
    mappedReleaseRules = mapCustomReleaseRules(customReleaseRules);
  }

  const { GITHUB_REF, GITHUB_SHA } = process.env;

  if (!GITHUB_REF) {
    core.setFailed('Missing GITHUB_REF.');
    return;
  }

  const commitRef = commitSha || GITHUB_SHA;
  if (!commitRef) {
    core.setFailed('Missing commit_sha or GITHUB_SHA.');
    return;
  }

  let preReleaseIdentifier: string;
  let isPrerelease: boolean;

  const customTagPrerelease = prerelease(customTag);
  if (customTag && customTagPrerelease) {
    preReleaseIdentifier = customTagPrerelease[0].toString();
    isPrerelease = true;
  } else {
    preReleaseIdentifier = default_preReleaseIdentifier;
    isPrerelease = default_isPreRelease;
  }

  const currentBranch = getBranchFromRef(GITHUB_REF);
  const isReleaseBranch = releaseBranches
    .split(',')
    .some((branch) => currentBranch.match(branch));

  const prefixRegex = new RegExp(`^${tagPrefix}`);

  const validTags = await getValidTags(
    prefixRegex,
    /true/i.test(shouldFetchAllTags)
  );
  const latestTag = getLatestTag(validTags, prefixRegex, tagPrefix);
  const latestPrereleaseTag = getLatestPrereleaseTag(
    validTags,
    preReleaseIdentifier,
    prefixRegex
  );

  let commits: Await<ReturnType<typeof getCommits>>;

  let newVersion: string;

  let previousTag: ReturnType<typeof getLatestTag> | undefined;
  if (customTag && !valid(customTag)) {
    commits = await getCommits(latestTag.commit.sha, commitRef);

    core.setOutput('release_type', 'custom');
    newVersion = customTag;
  } else {
    // Note that if custom tag is defined, it is valid semver within this else block

    let previousVersion: SemVer | null;
    if (!latestPrereleaseTag) {
      previousTag = latestTag;
    } else {
      previousTag = gte(
        latestTag.name.replace(prefixRegex, ''),
        latestPrereleaseTag.name.replace(prefixRegex, '')
      )
        ? latestTag
        : latestPrereleaseTag;
    }

    if (!previousTag) {
      core.setFailed('Could not find previous tag.');
      return;
    }

    previousVersion = parse(previousTag.name.replace(prefixRegex, ''));

    if (!previousVersion) {
      core.setFailed('Could not parse previous tag.');
      return;
    }

    core.info(
      `Previous tag was ${previousTag.name}, previous version was ${previousVersion.version}.`
    );
    core.setOutput('previous_version', previousVersion.version);
    core.setOutput('previous_tag', previousTag.name);

    commits = await getCommits(previousTag.commit.sha, commitRef);

    // Determine release type based on commits/bump or custom tag
    let releaseType: ReleaseType;
    if (customTag) {
      releaseType = diff(previousVersion, customTag) as ReleaseType;
    } else {
      let bump = await analyzeCommits(
        {
          releaseRules: mappedReleaseRules
            ? // analyzeCommits doesn't appreciate rules with a section /shrug
              mappedReleaseRules.map(({ section, ...rest }) => ({ ...rest }))
            : undefined,
        },
        { commits, logger: { log: console.info.bind(console) } }
      );

      // Determine if we should continue with tag creation
      let shouldContinue = true;
      if (!bump && defaultBump === 'false') {
        shouldContinue = false;
      }

      // Default bump is set to false and we did not find an automatic bump
      if (!shouldContinue) {
        core.debug(
          'No commit specifies the version bump. Skipping the tag creation.'
        );
        return;
      }

      // If somebody uses custom release rules with a prerelease they might create a 'preprepatch' bump.
      const preReg = /^pre/;
      if (isPrerelease && preReg.test(bump)) {
        bump = bump.replace(preReg, '');
      }

      releaseType = isPrerelease
        ? `pre${bump || defaultBump}`
        : bump || defaultBump;
    }

    core.setOutput('release_type', releaseType);

    // Auto bump tag if custom tag is not provided
    if (!customTag) {
      const incrementedVersion = inc(
        previousVersion,
        releaseType,
        preReleaseIdentifier
      );

      if (!incrementedVersion) {
        core.setFailed('Could not increment version.');
        return;
      }

      if (!valid(incrementedVersion)) {
        core.setFailed(`${incrementedVersion} is not a valid semver.`);
        return;
      }

      newVersion = incrementedVersion;
    } else {
      newVersion = customTag;
    }
  }

  core.info(`New version is ${newVersion}.`);
  core.setOutput('new_version', newVersion);

  let newTag: string;
  if (!customTag || applyPrefixToCustomTag) {
    newTag = `${tagPrefix}${newVersion}`;
  } else {
    // No custom tag and applyPrefixToCustomTag is false
    newTag = newVersion;
  }
  core.info(`New tag after applying prefix is ${newTag}.`);
  core.setOutput('new_tag', newTag);

  const changelog = await generateNotes(
    {
      preset: 'conventionalcommits',
      presetConfig: {
        types: mergeWithDefaultChangelogRules(mappedReleaseRules),
      },
    },
    {
      commits,
      logger: { log: console.info.bind(console) },
      options: {
        repositoryUrl: `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}`,
      },
      lastRelease: { gitTag: previousTag?.name || latestTag.name },
      nextRelease: { gitTag: newTag, version: newVersion },
    }
  );
  core.info(`Changelog is ${changelog}.`);
  core.setOutput('changelog', changelog);

  if (!isReleaseBranch) {
    core.info(
      'This branch is not a release branch. Skipping the tag creation.'
    );
    return;
  }

  if (validTags.map((tag) => tag.name).includes(newTag)) {
    core.info('This tag already exists. Skipping the tag creation.');
    return;
  }

  if (/true/i.test(dryRun)) {
    core.info('Dry run: not performing tag action.');
    return;
  }

  await createTag(newTag, createAnnotatedTag, commitRef);
}

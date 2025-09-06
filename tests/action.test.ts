import action from '../src/action';
import * as utils from '../src/utils';
import * as github from '../src/github';
import * as core from '@actions/core';
import {
  loadDefaultInputs,
  setBranch,
  setCommitSha,
  setInput,
  setRepository,
} from './helper.test';

jest.spyOn(core, 'debug').mockImplementation(() => {});
jest.spyOn(core, 'info').mockImplementation(() => {});
jest.spyOn(console, 'info').mockImplementation(() => {});

beforeAll(() => {
  setRepository('https://github.com', 'org/repo');
});

const mockCreateTag = jest
  .spyOn(github, 'createTag')
  .mockResolvedValue(undefined);

const mockSetOutput = jest
  .spyOn(core, 'setOutput')
  .mockImplementation(() => {});

const mockSetFailed = jest.spyOn(core, 'setFailed');

describe('github-tag-action', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setBranch('master');
    setCommitSha('79e0ea271c26aa152beef77c3275ff7b8f8d8274');
    loadDefaultInputs();
  });

  describe('special cases', () => {
    it('does create initial tag', async () => {
      /*
       * Given
       */
      const commits = [{ message: 'fix: this is my first fix', hash: null }];
      jest
        .spyOn(utils, 'getCommits')
        .mockImplementation(async (sha) => commits);

      const validTags: any[] = [];
      jest
        .spyOn(utils, 'getValidTags')
        .mockImplementation(async () => validTags);

      /*
       * When
       */
      await action();

      /*
       * Then
       */
      expect(mockCreateTag).toHaveBeenCalledWith(
        'v0.0.1',
        expect.any(Boolean),
        expect.any(String)
      );
      expect(mockSetFailed).not.toBeCalled();
    });

    it('does create patch tag without commits', async () => {
      /*
       * Given
       */
      const commits: any[] = [];
      jest
        .spyOn(utils, 'getCommits')
        .mockImplementation(async (sha) => commits);

      const validTags: any[] = [];
      jest
        .spyOn(utils, 'getValidTags')
        .mockImplementation(async () => validTags);

      /*
       * When
       */
      await action();

      /*
       * Then
       */
      expect(mockCreateTag).toHaveBeenCalledWith(
        'v0.0.1',
        expect.any(Boolean),
        expect.any(String)
      );
      expect(mockSetFailed).not.toBeCalled();
    });

    it('does not create tag without commits and default_bump set to false', async () => {
      /*
       * Given
       */
      setInput('default_bump', 'false');
      const commits: any[] = [];
      jest
        .spyOn(utils, 'getCommits')
        .mockImplementation(async (sha) => commits);

      const validTags = [
        {
          name: 'v1.2.3',
          commit: { sha: '012345', url: '' },
          zipball_url: '',
          tarball_url: 'string',
          node_id: 'string',
        },
      ];
      jest
        .spyOn(utils, 'getValidTags')
        .mockImplementation(async () => validTags);

      /*
       * When
       */
      await action();

      /*
       * Then
       */
      expect(mockCreateTag).not.toBeCalled();
      expect(mockSetFailed).not.toBeCalled();
    });

    it('does create tag using custom release types', async () => {
      /*
       * Given
       */
      setInput('custom_release_rules', 'james:patch,bond:major');
      const commits = [
        { message: 'james: is the new cool guy', hash: null },
        { message: 'bond: is his last name', hash: null },
      ];
      jest
        .spyOn(utils, 'getCommits')
        .mockImplementation(async (sha) => commits);

      const validTags = [
        {
          name: 'v1.2.3',
          commit: { sha: '012345', url: '' },
          zipball_url: '',
          tarball_url: 'string',
          node_id: 'string',
        },
      ];
      jest
        .spyOn(utils, 'getValidTags')
        .mockImplementation(async () => validTags);

      /*
       * When
       */
      await action();

      /*
       * Then
       */
      expect(mockCreateTag).toHaveBeenCalledWith(
        'v2.0.0',
        expect.any(Boolean),
        expect.any(String)
      );
      expect(mockSetFailed).not.toBeCalled();
    });

    it('does create tag using custom release types but non-custom commit message', async () => {
      /*
       * Given
       */
      setInput('custom_release_rules', 'james:patch,bond:major');
      const commits = [
        { message: 'fix: is the new cool guy', hash: null },
        { message: 'feat: is his last name', hash: null },
      ];
      jest
        .spyOn(utils, 'getCommits')
        .mockImplementation(async (sha) => commits);

      const validTags = [
        {
          name: 'v1.2.3',
          commit: { sha: '012345', url: '' },
          zipball_url: '',
          tarball_url: 'string',
          node_id: 'string',
        },
      ];
      jest
        .spyOn(utils, 'getValidTags')
        .mockImplementation(async () => validTags);

      /*
       * When
       */
      await action();

      /*
       * Then
       */
      expect(mockCreateTag).toHaveBeenCalledWith(
        'v1.3.0',
        expect.any(Boolean),
        expect.any(String)
      );
      expect(mockSetFailed).not.toBeCalled();
    });
  });

  describe('regular release', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      setBranch('release');
      setInput('release_branches', 'release');
    });

    it('does create patch tag', async () => {
      /*
       * Given
       */
      const commits = [{ message: 'fix: this is my first fix', hash: null }];
      jest
        .spyOn(utils, 'getCommits')
        .mockImplementation(async (sha) => commits);

      const validTags = [
        {
          name: 'v1.2.3',
          commit: { sha: '012345', url: '' },
          zipball_url: '',
          tarball_url: 'string',
          node_id: 'string',
        },
      ];
      jest
        .spyOn(utils, 'getValidTags')
        .mockImplementation(async () => validTags);

      /*
       * When
       */
      await action();

      /*
       * Then
       */
      expect(mockCreateTag).toHaveBeenCalledWith(
        'v1.2.4',
        expect.any(Boolean),
        expect.any(String)
      );
      expect(mockSetFailed).not.toBeCalled();
    });

    it('does create minor tag', async () => {
      /*
       * Given
       */
      const commits = [
        { message: 'feat: this is my first feature', hash: null },
      ];
      jest
        .spyOn(utils, 'getCommits')
        .mockImplementation(async (sha) => commits);

      const validTags = [
        {
          name: 'v1.2.3',
          commit: { sha: '012345', url: '' },
          zipball_url: '',
          tarball_url: 'string',
          node_id: 'string',
        },
      ];
      jest
        .spyOn(utils, 'getValidTags')
        .mockImplementation(async () => validTags);

      /*
       * When
       */
      await action();

      /*
       * Then
       */
      expect(mockCreateTag).toHaveBeenCalledWith(
        'v1.3.0',
        expect.any(Boolean),
        expect.any(String)
      );
      expect(mockSetFailed).not.toBeCalled();
    });

    it('does create major tag', async () => {
      /*
       * Given
       */
      const commits = [
        {
          message:
            'my commit message\nBREAKING CHANGE:\nthis is a breaking change',
          hash: null,
        },
      ];
      jest
        .spyOn(utils, 'getCommits')
        .mockImplementation(async (sha) => commits);

      const validTags = [
        {
          name: 'v1.2.3',
          commit: { sha: '012345', url: '' },
          zipball_url: '',
          tarball_url: 'string',
          node_id: 'string',
        },
      ];
      jest
        .spyOn(utils, 'getValidTags')
        .mockImplementation(async () => validTags);

      /*
       * When
       */
      await action();

      /*
       * Then
       */
      expect(mockCreateTag).toHaveBeenCalledWith(
        'v2.0.0',
        expect.any(Boolean),
        expect.any(String)
      );
      expect(mockSetFailed).not.toBeCalled();
    });

    it('does create tag when pre-release tag is newer', async () => {
      /*
       * Given
       */
      const commits = [
        { message: 'feat: some new feature on a release branch', hash: null },
      ];
      jest
        .spyOn(utils, 'getCommits')
        .mockImplementation(async (sha) => commits);

      const validTags = [
        {
          name: 'v1.2.3',
          commit: { sha: '012345', url: '' },
          zipball_url: '',
          tarball_url: 'string',
          node_id: 'string',
        },
        {
          name: 'v2.1.3-rc.0',
          commit: { sha: '678901', url: '' },
          zipball_url: '',
          tarball_url: 'string',
          node_id: 'string',
        },
        {
          name: 'v2.1.3-rc.1',
          commit: { sha: '234567', url: '' },
          zipball_url: '',
          tarball_url: 'string',
          node_id: 'string',
        },
      ];
      jest
        .spyOn(utils, 'getValidTags')
        .mockImplementation(async () => validTags);

      /*
       * When
       */
      await action();

      /*
       * Then
       */
      expect(mockCreateTag).toHaveBeenCalledWith(
        'v2.2.0',
        expect.any(Boolean),
        expect.any(String)
      );
      expect(mockSetFailed).not.toBeCalled();
    });

    it('does create tag with custom release rules', async () => {
      /*
       * Given
       */
      setInput('custom_release_rules', 'james:preminor');
      const commits = [
        {
          message: 'feat: some new feature on a pre-release branch',
          hash: null,
        },
        { message: 'james: this should make a preminor', hash: null },
      ];
      jest
        .spyOn(utils, 'getCommits')
        .mockImplementation(async (sha) => commits);

      const validTags = [
        {
          name: 'v1.2.3',
          commit: { sha: '012345', url: '' },
          zipball_url: '',
          tarball_url: 'string',
          node_id: 'string',
        },
      ];
      jest
        .spyOn(utils, 'getValidTags')
        .mockImplementation(async () => validTags);

      /*
       * When
       */
      await action();

      /*
       * Then
       */
      expect(mockCreateTag).toHaveBeenCalledWith(
        'v1.3.0',
        expect.any(Boolean),
        expect.any(String)
      );
      expect(mockSetFailed).not.toBeCalled();
    });
  });

  describe('pre-release', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      setBranch('main');
      setInput('is_pre_release', 'true');
    });

    it('does not create tag without commits and default_bump set to false', async () => {
      /*
       * Given
       */
      setInput('default_bump', 'false');
      const commits: any[] = [];
      jest
        .spyOn(utils, 'getCommits')
        .mockImplementation(async (sha) => commits);

      const validTags = [
        {
          name: 'v1.2.3',
          commit: { sha: '012345', url: '' },
          zipball_url: '',
          tarball_url: 'string',
          node_id: 'string',
        },
      ];
      jest
        .spyOn(utils, 'getValidTags')
        .mockImplementation(async () => validTags);

      /*
       * When
       */
      await action();

      /*
       * Then
       */
      expect(mockCreateTag).not.toBeCalled();
      expect(mockSetFailed).not.toBeCalled();
    });

    it('does create prerelease tag', async () => {
      /*
       * Given
       */
      const commits = [{ message: 'this is my first fix', hash: null }];
      jest
        .spyOn(utils, 'getCommits')
        .mockImplementation(async (sha) => commits);

      const validTags = [
        {
          name: 'v1.2.3',
          commit: { sha: '012345', url: '' },
          zipball_url: '',
          tarball_url: 'string',
          node_id: 'string',
        },
      ];
      jest
        .spyOn(utils, 'getValidTags')
        .mockImplementation(async () => validTags);

      /*
       * When
       */
      await action();

      /*
       * Then
       */
      expect(mockCreateTag).toHaveBeenCalledWith(
        'v1.2.4-rc.0',
        expect.any(Boolean),
        expect.any(String)
      );
      expect(mockSetFailed).not.toBeCalled();
    });

    it('does create prepatch tag', async () => {
      /*
       * Given
       */
      const commits = [{ message: 'fix: this is my first fix', hash: null }];
      jest
        .spyOn(utils, 'getCommits')
        .mockImplementation(async (sha) => commits);

      const validTags = [
        {
          name: 'v1.2.3',
          commit: { sha: '012345', url: '' },
          zipball_url: '',
          tarball_url: 'string',
          node_id: 'string',
        },
      ];
      jest
        .spyOn(utils, 'getValidTags')
        .mockImplementation(async () => validTags);

      /*
       * When
       */
      await action();

      /*
       * Then
       */
      expect(mockCreateTag).toHaveBeenCalledWith(
        'v1.2.4-rc.0',
        expect.any(Boolean),
        expect.any(String)
      );
      expect(mockSetFailed).not.toBeCalled();
    });

    it('does create preminor tag', async () => {
      /*
       * Given
       */
      const commits = [
        { message: 'feat: this is my first feature', hash: null },
      ];
      jest
        .spyOn(utils, 'getCommits')
        .mockImplementation(async (sha) => commits);

      const validTags = [
        {
          name: 'v1.2.3',
          commit: { sha: '012345', url: '' },
          zipball_url: '',
          tarball_url: 'string',
          node_id: 'string',
        },
      ];
      jest
        .spyOn(utils, 'getValidTags')
        .mockImplementation(async () => validTags);

      /*
       * When
       */
      await action();

      /*
       * Then
       */
      expect(mockCreateTag).toHaveBeenCalledWith(
        'v1.3.0-rc.0',
        expect.any(Boolean),
        expect.any(String)
      );
      expect(mockSetFailed).not.toBeCalled();
    });

    it('does create premajor tag', async () => {
      /*
       * Given
       */
      const commits = [
        {
          message:
            'my commit message\nBREAKING CHANGE:\nthis is a breaking change',
          hash: null,
        },
      ];
      jest
        .spyOn(utils, 'getCommits')
        .mockImplementation(async (sha) => commits);

      const validTags = [
        {
          name: 'v1.2.3',
          commit: { sha: '012345', url: '' },
          zipball_url: '',
          tarball_url: 'string',
          node_id: 'string',
        },
      ];
      jest
        .spyOn(utils, 'getValidTags')
        .mockImplementation(async () => validTags);

      /*
       * When
       */
      await action();

      /*
       * Then
       */
      expect(mockCreateTag).toHaveBeenCalledWith(
        'v2.0.0-rc.0',
        expect.any(Boolean),
        expect.any(String)
      );
      expect(mockSetFailed).not.toBeCalled();
    });

    it('does create tag when release tag is newer', async () => {
      /*
       * Given
       */
      const commits = [
        {
          message: 'feat: some new feature on a pre-release branch',
          hash: null,
        },
      ];
      jest
        .spyOn(utils, 'getCommits')
        .mockImplementation(async (sha) => commits);

      const validTags = [
        {
          name: 'v1.2.3-rc.0',
          commit: { sha: '012345', url: '' },
          zipball_url: '',
          tarball_url: 'string',
          node_id: 'string',
        },
        {
          name: 'v3.1.2-feature.0',
          commit: { sha: '012345', url: '' },
          zipball_url: '',
          tarball_url: 'string',
          node_id: 'string',
        },
        {
          name: 'v2.1.4',
          commit: { sha: '234567', url: '' },
          zipball_url: '',
          tarball_url: 'string',
          node_id: 'string',
        },
      ];
      jest
        .spyOn(utils, 'getValidTags')
        .mockImplementation(async () => validTags);

      /*
       * When
       */
      await action();

      /*
       * Then
       */
      expect(mockCreateTag).toHaveBeenCalledWith(
        'v2.2.0-rc.0',
        expect.any(Boolean),
        expect.any(String)
      );
      expect(mockSetFailed).not.toBeCalled();
    });

    it('does create tag with custom release rules', async () => {
      /*
       * Given
       */
      setInput('custom_release_rules', 'james:preminor');
      const commits = [
        {
          message: 'feat: some new feature on a pre-release branch',
          hash: null,
        },
        { message: 'james: this should make a preminor', hash: null },
      ];
      jest
        .spyOn(utils, 'getCommits')
        .mockImplementation(async (sha) => commits);

      const validTags = [
        {
          name: 'v1.2.3',
          commit: { sha: '012345', url: '' },
          zipball_url: '',
          tarball_url: 'string',
          node_id: 'string',
        },
      ];
      jest
        .spyOn(utils, 'getValidTags')
        .mockImplementation(async () => validTags);

      /*
       * When
       */
      await action();

      /*
       * Then
       */
      expect(mockCreateTag).toHaveBeenCalledWith(
        'v1.3.0-rc.0',
        expect.any(Boolean),
        expect.any(String)
      );
      expect(mockSetFailed).not.toBeCalled();
    });
  });

  describe('non release branch', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      setBranch('development');
      setInput('release_branches', 'release');
    });

    it('does output patch tag', async () => {
      /*
       * Given
       */
      const commits = [{ message: 'fix: this is my first fix', hash: null }];
      jest
        .spyOn(utils, 'getCommits')
        .mockImplementation(async (sha) => commits);

      const validTags = [
        {
          name: 'v1.2.3',
          commit: { sha: '012345', url: '' },
          zipball_url: '',
          tarball_url: 'string',
          node_id: 'string',
        },
      ];
      jest
        .spyOn(utils, 'getValidTags')
        .mockImplementation(async () => validTags);

      /*
       * When
       */
      await action();

      /*
       * Then
       */
      expect(mockSetOutput).toHaveBeenCalledWith('new_version', '1.2.4');
      expect(mockCreateTag).not.toBeCalled();
      expect(mockSetFailed).not.toBeCalled();
    });

    it('does output minor tag', async () => {
      /*
       * Given
       */
      const commits = [
        { message: 'feat: this is my first feature', hash: null },
      ];
      jest
        .spyOn(utils, 'getCommits')
        .mockImplementation(async (sha) => commits);

      const validTags = [
        {
          name: 'v1.2.3',
          commit: { sha: '012345', url: '' },
          zipball_url: '',
          tarball_url: 'string',
          node_id: 'string',
        },
      ];
      jest
        .spyOn(utils, 'getValidTags')
        .mockImplementation(async () => validTags);

      /*
       * When
       */
      await action();

      /*
       * Then
       */
      expect(mockSetOutput).toHaveBeenCalledWith('new_version', '1.3.0');
      expect(mockCreateTag).not.toBeCalled();
      expect(mockSetFailed).not.toBeCalled();
    });

    it('does output major tag', async () => {
      /*
       * Given
       */
      const commits = [
        {
          message:
            'my commit message\nBREAKING CHANGE:\nthis is a breaking change',
          hash: null,
        },
      ];
      jest
        .spyOn(utils, 'getCommits')
        .mockImplementation(async (sha) => commits);

      const validTags = [
        {
          name: 'v1.2.3',
          commit: { sha: '012345', url: '' },
          zipball_url: '',
          tarball_url: 'string',
          node_id: 'string',
        },
      ];
      jest
        .spyOn(utils, 'getValidTags')
        .mockImplementation(async () => validTags);

      /*
       * When
       */
      await action();

      /*
       * Then
       */
      expect(mockSetOutput).toHaveBeenCalledWith('new_version', '2.0.0');
      expect(mockCreateTag).not.toBeCalled();
      expect(mockSetFailed).not.toBeCalled();
    });
  });

  describe('custom tag', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      setBranch('master');
    });

    it("does create tag when custom tag isn't semver", async () => {
      /*
      * Given
      */
     setInput('custom_tag', '2024-09-01');
      const commits = [{ message: 'fix: this is my first fix', hash: null }];
      jest
        .spyOn(utils, 'getCommits')
        .mockImplementation(async (sha) => commits);

      const validTags = [
        {
          name: 'v1.2.3',
          commit: { sha: '012345', url: '' },
          zipball_url: '',
          tarball_url: 'string',
          node_id: 'string',
        },
      ];
      jest
        .spyOn(utils, 'getValidTags')
        .mockImplementation(async () => validTags);

      /*
       * When
       */
      await action();

      /*
       * Then
       */
      expect(mockCreateTag).toHaveBeenCalledWith(
        'v2024-09-01',
        expect.any(Boolean),
        expect.any(String)
      );
      expect(mockSetFailed).not.toBeCalled();
      expect(mockSetOutput).toHaveBeenCalledWith('release_type', 'custom');
    });

    it('does create tag when custom tag is semver', async () => {
      /*
       * Given
       */
      setInput('custom_tag', '2.1.0');
      const commits = [{ message: 'fix: this is my first fix', hash: null }];
      jest
        .spyOn(utils, 'getCommits')
        .mockImplementation(async (sha) => commits);

      const validTags = [
        {
          name: 'v1.2.3',
          commit: { sha: '012345', url: '' },
          zipball_url: '',
          tarball_url: 'string',
          node_id: 'string',
        },
      ];
      jest
        .spyOn(utils, 'getValidTags')
        .mockImplementation(async () => validTags);

      /*
       * When
       */
      await action();

      /*
       * Then
       */
      expect(mockCreateTag).toHaveBeenCalledWith(
        'v2.1.0',
        expect.any(Boolean),
        expect.any(String)
      );
      expect(mockSetFailed).not.toBeCalled();
      expect(mockSetOutput).toHaveBeenCalledWith('release_type', 'major');
      expect(mockSetOutput).toHaveBeenCalledWith('previous_tag', 'v1.2.3');
      expect(mockSetOutput).toHaveBeenCalledWith('previous_version', '1.2.3');
    });

    it('does create tag when custom tag is pre-release semver', async () => {
      /*
       * Given
       */
      setInput('custom_tag', '2.1.0-rc.1');
      const commits = [{ message: 'fix: this is my first fix', hash: null }];
      jest
        .spyOn(utils, 'getCommits')
        .mockImplementation(async (sha) => commits);

      const validTags = [
        {
          name: 'v1.2.3',
          commit: { sha: '012345', url: '' },
          zipball_url: '',
          tarball_url: 'string',
          node_id: 'string',
        },
      ];
      jest
        .spyOn(utils, 'getValidTags')
        .mockImplementation(async () => validTags);

      /*
       * When
       */
      await action();

      /*
       * Then
       */
      expect(mockCreateTag).toHaveBeenCalledWith(
        'v2.1.0-rc.1',
        expect.any(Boolean),
        expect.any(String)
      );
      expect(mockSetFailed).not.toBeCalled();
      expect(mockSetOutput).toHaveBeenCalledWith('release_type', 'premajor');
      expect(mockSetOutput).toHaveBeenCalledWith('previous_tag', 'v1.2.3');
      expect(mockSetOutput).toHaveBeenCalledWith('previous_version', '1.2.3');
    });

    it('does create tag when custom tag is pre-release semver and has previous pre-release tag', async () => {
      /*
       * Given
       */
      setInput('custom_tag', '2.0.0-rc.1');
      const commits = [{ message: 'fix: this is my first fix', hash: null }];
      jest
        .spyOn(utils, 'getCommits')
        .mockImplementation(async (sha) => commits);

      const validTags = [
        {
          name: 'v1.2.3',
          commit: { sha: '012345', url: '' },
          zipball_url: '',
          tarball_url: 'string',
          node_id: 'string',
        },
        {
          name: 'v2.0.0-rc.0',
          commit: { sha: '012345', url: '' },
          zipball_url: '',
          tarball_url: 'string',
          node_id: 'string',
        },
      ];
      jest
        .spyOn(utils, 'getValidTags')
        .mockImplementation(async () => validTags);

      /*
       * When
       */
      await action();

      /*
       * Then
       */
      expect(mockCreateTag).toHaveBeenCalledWith(
        'v2.0.0-rc.1',
        expect.any(Boolean),
        expect.any(String)
      );
      expect(mockSetFailed).not.toBeCalled();
      expect(mockSetOutput).toHaveBeenCalledWith('release_type', 'prerelease');
      expect(mockSetOutput).toHaveBeenCalledWith('previous_tag', 'v2.0.0-rc.0');
      expect(mockSetOutput).toHaveBeenCalledWith('previous_version', '2.0.0-rc.0');
    });

    it('does create tag when custom tag is semver and apply_prefix_to_custom_tag is false', async () => {
      /*
       * Given
       */
      setInput('custom_tag', '2.1.0');
      setInput('apply_prefix_to_custom_tag', 'false');
      const commits = [{ message: 'fix: this is my first fix', hash: null }];
      jest
        .spyOn(utils, 'getCommits')
        .mockImplementation(async (sha) => commits);

      const validTags = [
        {
          name: 'v1.2.3',
          commit: { sha: '012345', url: '' },
          zipball_url: '',
          tarball_url: 'string',
          node_id: 'string',
        },
      ];
      jest
        .spyOn(utils, 'getValidTags')
        .mockImplementation(async () => validTags);

      /*
       * When
       */
      await action();

      /*
       * Then
       */
      expect(mockCreateTag).toHaveBeenCalledWith(
        '2.1.0',
        expect.any(Boolean),
        expect.any(String)
      );
      expect(mockSetFailed).not.toBeCalled();
    });

    it("does create tag when custom tag isn't semver and apply_prefix_to_custom_tag is false", async () => {
      /*
      * Given
      */
     setInput('custom_tag', '2024-09-01');
     setInput('apply_prefix_to_custom_tag', 'false');
      const commits = [{ message: 'fix: this is my first fix', hash: null }];
      jest
        .spyOn(utils, 'getCommits')
        .mockImplementation(async (sha) => commits);

      const validTags = [
        {
          name: 'v1.2.3',
          commit: { sha: '012345', url: '' },
          zipball_url: '',
          tarball_url: 'string',
          node_id: 'string',
        },
      ];
      jest
        .spyOn(utils, 'getValidTags')
        .mockImplementation(async () => validTags);

      /*
       * When
       */
      await action();

      /*
       * Then
       */
      expect(mockCreateTag).toHaveBeenCalledWith(
        '2024-09-01',
        expect.any(Boolean),
        expect.any(String)
      );
      expect(mockSetFailed).not.toBeCalled();
    });
  });
});

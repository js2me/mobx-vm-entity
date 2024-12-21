import { postBuildScript, publishScript } from 'js2me-exports-post-build-script';

postBuildScript({
  buildDir: 'dist',
  rootDir: '.',
  srcDirName: 'src',
  filesToCopy: ['LICENSE', 'README.md', 'assets'],
  updateVersion: process.env.PUBLISH_VERSION,
  onDone: (versionsDiff, _, packageJson, { targetPackageJson}) => {
    if (process.env.PUBLISH) {
      publishScript({
        nextVersion: versionsDiff?.next ?? packageJson.version,
        currVersion: versionsDiff?.current,
        publishCommand: 'pnpm publish && npm deprecate mobx-vm-entities "This project has been renamed. Install mobx-view-model instead."',
        commitAllCurrentChanges: true,
        createTag: true,
        githubRepoLink: 'https://github.com/js2me/mobx-view-model',
        cleanupCommand: 'pnpm clean', 
        targetPackageJson,
        otherNames: ['mobx-view-model']
      })
    }
  }
});


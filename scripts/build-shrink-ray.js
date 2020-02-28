const {resolve} = require('path');
const {execSync} = require('child_process');
const {readFile} = require('fs-extra');
const {
  Logger,
  Build,
  ShrinkRayAPI,
  SHRINK_RAY_SERVER,
  Check,
} = require('@shopify/shrink-ray');

process.on('unhandledRejection', (reason) => {
  throw reason;
});

startShrinkRayBuild({
  masterBranchName: 'master',
  repo: 'polaris-react',
  sha: process.env.TRAVIS_COMMIT,
  reportPath: resolve(
    __dirname,
    '../build/storybook/bundle-analysis/report.html',
  ),
  server: SHRINK_RAY_SERVER,
  buildUrl: process.env.TRAVIS_JOB_WEB_URL,
});

async function startShrinkRayBuild({
  masterBranchName,
  repo,
  sha,
  reportPath,
  server = SHRINK_RAY_SERVER,
  buildUrl,
}) {
  const logger = new Logger();

  if (sha) {
    logger.header('Running shrink-ray prebuild script...');

    // fetch latest in pipeline. Travis does a shallow clone by default,
    // --unshallow makes sure we can fetch the master commit in case it is not
    // included in the initial shallow clone
    execSync('git fetch --unshallow origin master:refs/remotes/origin/master');

    const masterSha = execSync(
      `git merge-base HEAD origin/${masterBranchName}`,
      {
        encoding: 'utf8',
      },
    ).trim();

    const shrinkRay = new ShrinkRayAPI({server});
    const build = new Build({
      repo,
      sha,
      masterSha,
    });

    try {
      logger.header('Validating...');
      build.validate();
      logger.for('validation').log('✅ sha validation successful!');

      logger.header('Initializing check(s) on GitHub');
      await shrinkRay.create({...build, buildUrl, skip: [Check.Entrypoints]});

      buildStorybookBuild();

      logger.header(`Uploading build report to Shrink-Ray (${server})`);
      await shrinkRay.report(build, await bundleAnalyzerReport(reportPath));
    } catch (error) {
      await shrinkRay.error(build, error);
      process.exit(1);
    }
  } else {
    buildStorybookBuild();
  }
}

function buildStorybookBuild() {
  const logger = new Logger();

  logger.header('Running storybook build...');
  execSync('yarn run storybook:build --quiet', {
    stdio: 'inherit',
  });
}

function bundleAnalyzerReport(reportPath) {
  try {
    return readFile(reportPath, 'utf-8');
  } catch (error) {
    throw new Error(
      `Could not read webpack-bundle-analyzer report: ${reportPath}`,
    );
  }
}

import { execSync } from 'child_process';

function checkBunVersion() {
  const currentBunVersion = execSync('bun --version').toString().trim();
  const [major] = currentBunVersion.split('.').map(Number);

  if (!currentBunVersion) {
    console.error(
      `\x1b[31m%s\x1b[0m`,
      `You are running the application from a directory that does not have Bun installed. Please install Bun and run "bun install" in your project directory.`,
    );

    process.exit(1);
  }

  if (major < 1) {
    console.error(
      `\x1b[31m%s\x1b[0m`,
      `You are running bun ${currentBunVersion}. The application requires bun >= 1.0.0.`,
    );

    process.exit(1);
  }

  console.log(
    `\x1b[32m%s\x1b[0m`,
    `You are running bun ${currentBunVersion}.`,
  );
}

function checkNodeVersion() {
  const requiredNodeVersion = '>=v20';
  const currentNodeVersion = process.versions.node;
  const [major] = currentNodeVersion.split('.').map(Number);

  if (major < 20) {
    console.error(
      `\x1b[31m%s\x1b[0m`,
      `You are running Node ${currentNodeVersion}. Application requires Node ${requiredNodeVersion}.`,
    );

    process.exit(1);
  } else {
    console.log(
      `\x1b[32m%s\x1b[0m`,
      `You are running Node ${currentNodeVersion}.`,
    );
  }
}

function checkPathNotOneDrive() {
  const path = process.cwd();

  if (path.includes('OneDrive')) {
    console.error(
      `\x1b[31m%s\x1b[0m`,
      `You are running the application from OneDrive. Please move your project to a local folder.`,
    );

    process.exit(1);
  }
}

function checkRequirements() {
  checkNodeVersion();
  checkPathNotOneDrive();
  checkBunVersion();
}

void checkRequirements();

import isGitClean from 'is-git-clean';

import { warn, info } from './logger';

export const isTypeAny = (value: any): value is any => {
  return value;
};
export const checkGitStatus = (force: boolean) => {
  let clean = false;
  let errorMessage = 'Unable to determine if git directory is clean';
  try {
    clean = isGitClean.sync(process.cwd());
    errorMessage = 'Git directory is not clean';
  } catch (err) {
    if (isTypeAny(err) && err?.stderr?.includes('Not a git repository')) {
      clean = true;
    }
  }

  if (!clean) {
    if (force) {
      warn(`${errorMessage}. Forcibly continuing.`);
    } else {
      warn('Before we continue, please stash or commit your git changes.');
      info('You may use the --force flag to override this safety check.');
      process.exit(1);
    }
  }
};

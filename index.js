#!/usr/bin/env node

const fs = require('fs');
const { search } = require('@inquirer/prompts');

console.log('AWS Profile Switcher');

const homeDir = process.env['HOME']
const profileRegex = /\[profile .*]/g;
const bracketsRemovalRegx = /(\[profile )|(\])/g;
const defaultProfileChoice = 'default';

const promptProfileChoice = async (data) => {
  const matches = data.match(profileRegex);

  if (!matches) {
    console.log('No profiles found.');
    console.log('Refer to this guide for help on setting up a new AWS profile:');
    console.log('https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html');

    return;
  }

  const profiles = matches.map((match) => {
    return match.replace(bracketsRemovalRegx, '');
  });

  profiles.push(defaultProfileChoice);

  const profile = await search({
    message: 'Choose a profile (type to search)',
    source: async (input) => {
      if (!input) {
        return profiles.map(profile => ({ name: profile, value: profile }));
      }

      const filtered = profiles.filter(profile =>
        profile.toLowerCase().includes(input.toLowerCase())
      );

      return filtered.map(profile => ({ name: profile, value: profile }));
    },
    pageSize: 10
  });

  return { profile };
}

const readAwsProfiles = () => {
  return new Promise((resolve, reject) => {
    fs.readFile(`${homeDir}/.aws/config`, 'utf8', (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};

const writeToConfig = (answers) => {
  const profileChoice =
    answers.profile === defaultProfileChoice ? '' : answers.profile;

  return new Promise((resolve, reject) => {
    fs.writeFile(`${homeDir}/.awsp`, profileChoice, { flag: 'w' }, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

readAwsProfiles()
  .then(async (data) => {
    const answers = await promptProfileChoice(data);
    if (answers) {
      return writeToConfig(answers);
    }
  })
  .catch(error => {
    // Handle user cancellation (Ctrl+C)
    if (error.name === 'ExitPromptError') {
      console.log('\nOperation cancelled by user.');
      process.exit(0);
    }
    else {
      console.log('Error:', error);
      process.exit(1);
    }
  });

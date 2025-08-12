import { writeFileSync } from 'fs';

const env = {
  production: true,
  apiUrl: process.env.API_URL ?? ''
};

writeFileSync('src/environments/environments.prod.ts',
`export const environment = ${JSON.stringify(env, null, 2)};\n`
);
console.log('✔ Wrote src/environments/environment.ts');

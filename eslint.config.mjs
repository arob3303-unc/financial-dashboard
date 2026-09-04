import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

/**
 * eslint-config-next 16 ships native flat configs, so the `FlatCompat` shim this file
 * used to need is gone.
 *
 * `next lint` was removed in Next 16 and `npm run lint` now calls `eslint` directly —
 * which means the ignores that `next lint` applied implicitly have to be declared here.
 */
const eslintConfig = [
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts"] },
  ...nextCoreWebVitals,
  ...nextTypeScript,
];

export default eslintConfig;

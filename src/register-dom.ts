import { GlobalRegistrator } from '@happy-dom/global-registrator'

/**
 * Installs happy-dom's globals.
 *
 * This is a module of its own, imported first by `./index.ts`, because
 * `react-dom` and `@testing-library/dom` both decide whether a DOM exists while
 * they are being evaluated and never look again:
 *
 * - `react-dom` computes `canUseDOM` once and gates its entire DOM
 *   event-plugin setup on it, so `fireEvent.change` never reaches a React
 *   handler and component state never updates.
 * - `@testing-library/dom` binds `screen` to `document.body` once, and
 *   otherwise leaves stubs that throw
 *   "For queries bound to document.body a global document has to be available".
 *
 * Registering after those modules load therefore yields a DOM that exists but
 * that neither library will ever use. Imports are evaluated before the
 * importing module's body in both ESM and CJS, so the registration cannot live
 * in `./index.ts` alongside the `@testing-library/react` import.
 */
if (!GlobalRegistrator.isRegistered) {
  GlobalRegistrator.register()
}

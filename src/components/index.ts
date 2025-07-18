import { setupPasswordPromptDialog } from "./password_prompt.ts";
import "./datetime.ts";

/**
 * Registers shared components that may be used by different components.
 * This should be registered as early as possible.
 */
export function registerSharedComponents(appContainer: HTMLElement) {
  const passwordDialogContainer = document.createElement("div");
  passwordDialogContainer.setAttribute("id", "password-dialog-container");
  appContainer.appendChild(passwordDialogContainer);
  setupPasswordPromptDialog(passwordDialogContainer);
}

/**
 * Craetes a new dialog container with the specified ID and adds it to the hierarchy.
 * This can later be used to render contents and display.
 *
 * @returns the created container
 */
export function registerDialogContainer(
  appContainer: HTMLElement,
  id: string,
): HTMLElement {
  const dialogContainer = document.createElement("div");
  dialogContainer.setAttribute("id", id);
  appContainer.appendChild(dialogContainer);
  return dialogContainer;
}

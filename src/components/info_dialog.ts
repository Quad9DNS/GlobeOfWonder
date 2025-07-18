import { registerDialogContainer } from ".";

/**
 * UI elements related to info dialog
 */
export interface InfoFields {
  /**
   * Element which opens up info dialog
   */
  openInfoButton: HTMLElement;
  /**
   * Parent to render dialog in
   */
  dialogContainer: HTMLElement;
}

/**
 * Places info dialog in the passed dialog container and connects it up to the passed button
 * When the button is pressed, dialog will be displayed
 *
 * @param fields UI fields for connecting the info dialog
 * @param contents Contents to display in the dialog. May be HTML.
 */
export function setupInfoDialog(fields: InfoFields, contents: string) {
  renderDialog(fields.dialogContainer, contents);

  const dialog =
    fields.dialogContainer.querySelector<HTMLDialogElement>("#infoDialog")!;
  dialog.addEventListener("click", (_event: Event) => {
    dialog.close();
  });
  const dialogArea =
    fields.dialogContainer.querySelector<HTMLDivElement>("#infoDialogArea")!;
  dialogArea.addEventListener("click", (event: Event) => {
    event?.stopPropagation();
  });
  dialog.close();

  fields.openInfoButton.addEventListener("click", (_event: Event) => {
    dialog.showModal();
  });
}

/**
 * Registers a new info dialog container in the passed app container and connects it up to the passed button
 * When the button is pressed, dialog will be displayed
 *
 * @param appContainer Main app container element
 * @param dialogId ID of the dialog container
 * @param openInfoButton Element which opens up info dialog
 * @param contents Contents to display in the dialog. May be HTML.
 */
export function registerInfoDialog(
  appContainer: HTMLElement,
  dialogId: string,
  openInfoButton: HTMLElement,
  contents: string,
) {
  setupInfoDialog(
    {
      openInfoButton: openInfoButton,
      dialogContainer: registerDialogContainer(appContainer, dialogId),
    },
    contents,
  );
}

function renderDialog(dialogContainer: HTMLElement, contents: string) {
  dialogContainer.innerHTML = `
    <dialog id="infoDialog" class="dialog-container">
      <div id="infoDialogArea" style="max-width: 800px; text-align: start;">
        ${contents}
      </div>
    </dialog>
  `;
}

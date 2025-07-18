/**
 * UI elements related to password prompt dialog
 */
interface PasswordPromptFields {
  dialog: HTMLDialogElement;
  label: HTMLLabelElement;
  field: HTMLInputElement;
  button: HTMLButtonElement;
}

interface PwPromptOptions {
  text: string | undefined;
  buttonText: string | undefined;
  callback: (password: string) => void;
}

let fields: PasswordPromptFields | null;

/**
 * Configures a password prompt dialog. This is required for the use of {@link promptPassword} function.
 */
export function setupPasswordPromptDialog(container: HTMLElement) {
  container.innerHTML = `
    <dialog id="passwordDialog" style="padding: 0;" class="dialog-container">
      <div id="passwordDialogArea" style="max-width: 800px; margin: 20px;">
        <label id="passwordinputlabel" for="passwordinput" style="display: block; margin: 5px;">Password:</label>
        <input id="passwordinput" type="password" name="passwordinput" style="display: block; margin: 5px;"/>
        <button id="passwordconfirmbutton">Confirm</button>
      </div>
    </dialog>
  `;

  fields = {
    dialog: container.querySelector<HTMLDialogElement>("#passwordDialog")!,
    label: container.querySelector<HTMLLabelElement>("#passwordinputlabel")!,
    field: container.querySelector<HTMLInputElement>("#passwordinput")!,
    button: container.querySelector<HTMLButtonElement>(
      "#passwordconfirmbutton",
    )!,
  };

  fields.dialog.addEventListener("click", (_event: Event) => {
    fields?.dialog.close();
  });
  const dialogArea = container.querySelector<HTMLDivElement>(
    "#passwordDialogArea",
  )!;
  dialogArea.addEventListener("click", (event: Event) => {
    event?.stopPropagation();
  });
  fields.dialog.close();
}

/**
 * Prompts user for a password.
 *
 * @param options can be used to customize displayed text and also provide a callback
 */
export function promptPassword(options: PwPromptOptions) {
  if (!fields) {
    return;
  }

  fields.label.textContent = options.text || "Password:";
  fields.button.textContent = options.buttonText || "Submit";

  const submit = function () {
    if (fields?.field) {
      options.callback(fields.field.value);
      fields.field.value = "";
    }
    fields?.button?.removeEventListener("click", submit);
    fields?.field?.removeEventListener("keypress", enterSubmit);
    fields?.dialog?.close();
  };
  const enterSubmit = function (e: KeyboardEvent) {
    if (e.key == "Enter") {
      submit();
    }
  };

  fields.field.addEventListener("keypress", enterSubmit);
  fields.button.addEventListener("click", submit);
  fields.dialog.showModal();
}

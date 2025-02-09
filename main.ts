import {
    App,
    Modal,
    Notice,
    Plugin,
    PluginSettingTab,
    Setting
} from 'obsidian';
import OpenAI from 'openai';

interface Pic2MarkdownSettings {
    mySetting: string;
    openaiApiKey: string;
}

const DEFAULT_SETTINGS: Pic2MarkdownSettings = {
    mySetting: 'default',
    openaiApiKey: ''
};

export default class Pic2Markdown extends Plugin {
    settings: Pic2MarkdownSettings;

    async onload() {
        console.log('loading Pic2Markdown plugin');
        await this.loadSettings();

        const ribbonIconEl = this.addRibbonIcon(
            'aperture',
            'Convert Image(s) to Markdown',
            () => {
                new Pic2MarkdownModal(this.app, this.settings).open();
            }
        );

        this.addSettingTab(new Pic2MarkdownSettingTab(this.app, this));
    }

    onunload() {
        console.log('unloading Picture to Markdown plugin');
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

class Pic2MarkdownModal extends Modal {
    settings: Pic2MarkdownSettings;
    spinnerEl: HTMLElement;

    constructor(app: App, settings: Pic2MarkdownSettings) {
        super(app);
        this.settings = settings;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.addClass('pic2markdown-modal');
        contentEl.createEl('h2', { text: 'Upload your Image(s)' });

        // === A select to choose the mode: Single, Multi, or Bulk ===
        const container = contentEl.createEl('div', { cls: 'mode-select-container' });
        container.createEl('label', { text: 'Choose mode:' });

        const modeSelect = container.createEl('select');
        ['Single Image', 'Multi Image', 'Bulk'].forEach((mode) => {
            const option = modeSelect.createEl('option');
            option.value = mode;
            option.text = mode;
        });

        // === Container for "Name of the new file" label & input ===
        const fileNameContainer = contentEl.createDiv({ cls: 'file-name-container' });
        fileNameContainer.createEl('label', { text: 'Name of the new file:' });

        const fileNameInput = fileNameContainer.createEl('input', { type: 'text' });
        fileNameInput.value = 'Untitled';

        // Hide or show container based on the current mode
        const updateFileNameVisibility = () => {
            if (modeSelect.value === 'Bulk') {
                fileNameContainer.classList.add('hidden');
            } else {
                fileNameContainer.classList.remove('hidden');
            }
        };
        updateFileNameVisibility();
        modeSelect.addEventListener('change', updateFileNameVisibility);

        // === Container for the "Select image(s)" label & file input ===
        const fileSelectContainer = contentEl.createDiv({ cls: 'file-select-container' });
        fileSelectContainer.createEl('label', { text: 'Select image(s):' });

        // Create wrapper div for custom file input
        const customFileInput = fileSelectContainer.createDiv({ cls: 'custom-file-input' });

        // Create hidden actual file input
        const fileInput = customFileInput.createEl('input', {
            cls: 'pic2markdown-file-input'
        }) as HTMLInputElement;
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.multiple = true;

        // Create visible custom button
        const customButton = customFileInput.createEl('button', {
            text: 'Choose Image(s)',
            cls: 'styled-file-button'
        });

        // Create element to display selected files
        const fileNamesDisplay = customFileInput.createEl('div', { cls: 'file-names' });

        // Link custom button to file input
        customButton.addEventListener('click', (e) => {
            e.preventDefault();
            fileInput.click();
        });

        // Update displayed file names when files are selected
        fileInput.addEventListener('change', () => {
            if (fileInput.files) {
                const names = Array.from(fileInput.files).map(f => f.name);
                fileNamesDisplay.textContent = names.join(', ');
            }
        });

        // --- Create a container that holds both button and spinner side by side ---
        const processContainer = contentEl.createDiv({ cls: 'pic2markdown-process-container' });

        // === A button to process the selected file(s) ===
        const processButton = processContainer.createEl('button', { text: 'Send to GPT-4o' });

        // === Create and append the spinner element to the container ===
        this.spinnerEl = processContainer.createEl('div', {
            cls: 'pic2markdown-spinner pic2markdown-spinner-hidden'
        });

        // On click, read user’s chosen file name + image(s), then process
        processButton.addEventListener('click', async () => {
            if (!fileInput.files || fileInput.files.length === 0) {
                new Notice('Please upload at least one image!');
                return;
            }

            // Show spinner
            this.spinnerEl.classList.remove('pic2markdown-spinner-hidden');
            this.spinnerEl.classList.add('pic2markdown-spinner-inline');
            processButton.disabled = true;

            try {
                const chosenMode = modeSelect.value; // Single Image, Multi Image, or Bulk
                if (chosenMode === 'Single Image') {
                    await this.handleSingleImage(fileInput, fileNameInput.value.trim());
                } else if (chosenMode === 'Multi Image') {
                    await this.handleMultiImage(fileInput, fileNameInput.value.trim());
                } else {
                    await this.handleBulk(fileInput);
                }
                this.close();
            } catch (error) {
                console.error(error);
                new Notice(
                    (error as Error).message || 'An error occurred processing the images.'
                );
            } finally {
                // Hide spinner
                this.spinnerEl.classList.remove('pic2markdown-spinner-inline');
                this.spinnerEl.classList.add('pic2markdown-spinner-hidden');
                processButton.disabled = false;
            }
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }

    /**
     * SINGLE IMAGE:
     * Processes only the first selected image, then creates a single note with fileName.
     */
    async handleSingleImage(fileInput: HTMLInputElement, fileName: string) {
        if (!fileName) {
            new Notice('Please enter a valid file name.');
            return;
        }

        const file = fileInput.files![0];
        const gptResult = await this.processImage(file);

        await this.createNewNoteWithContent(gptResult, fileName);
        new Notice(`Note "${fileName}" created successfully (Single Image).`);
    }

    /**
     * MULTI IMAGE:
     * Processes all selected images and concatenates GPT outputs
     * into one single note (named fileName).
     */
    async handleMultiImage(fileInput: HTMLInputElement, fileName: string) {
        if (!fileName) {
            new Notice('Please enter a valid file name.');
            return;
        }

        let combinedMarkdown = '';
        for (let i = 0; i < fileInput.files!.length; i++) {
            const file = fileInput.files![i];
            new Notice(`Processing image #${i + 1}: ${file.name}`);
            const gptResult = await this.processImage(file);

            combinedMarkdown += `## Image #${i + 1} - ${file.name}\n\n`;
            combinedMarkdown += gptResult + '\n\n';
        }

        await this.createNewNoteWithContent(combinedMarkdown, fileName);
        new Notice(`Note "${fileName}" created successfully (Multi Image).`);
    }

    /**
     * BULK:
     * Processes all selected images, creating a separate note for each file.
     * The note’s file name is the FIRST LINE of the GPT result, if available.
     */
    async handleBulk(fileInput: HTMLInputElement) {
        for (let i = 0; i < fileInput.files!.length; i++) {
            const file = fileInput.files![i];
            new Notice(`Processing image #${i + 1}: ${file.name}`);
            const gptResult = await this.processImage(file);

            let lines = gptResult.trim().split('\n');
            let firstLine = lines[0]?.trim() || '';
            // If first line is empty, fallback to generic name
            if (!firstLine) {
                firstLine = `Image_${i + 1}`;
            }
            // Remove invalid filename characters if necessary
            firstLine = firstLine.replace(/[<>:"/\\|?*]/g, '');

            await this.createNewNoteWithContent(gptResult, firstLine);
            new Notice(`Created note for "${file.name}" using bulk mode.`);
        }
    }

    /**
     * Convert the image to GPT-4 with Vision’s response.
     */
    async processImage(file: File): Promise<string> {
        if (!this.settings.openaiApiKey) {
            throw new Error('OpenAI API key is not set. Please configure it in the plugin settings.');
        }

        const openai = new OpenAI({
            apiKey: this.settings.openaiApiKey,
            dangerouslyAllowBrowser: true,
        });

        const reader = new FileReader();

        return new Promise((resolve, reject) => {
            reader.onload = async (event) => {
                if (event.target?.result) {
                    const imageData = event.target.result as string;

                    try {
                        const response = await openai.chat.completions.create({
                            model: "gpt-4o-mini", // or whichever model you're using
                            messages: [
                                {
                                    role: "user",
                                    content: [
                                        {
                                            type: "text",
                                            text: "Please convert the text in this image to Markdown. Only output the raw markdown. Do not summarize its content. Handle nested lists with tabs not spaces. Do not include 'markdown' at the top of your output."
                                        },
                                        {
                                            type: "image_url",
                                            image_url: {
                                                url: imageData,
                                                detail: "auto"
                                            }
                                        }
                                    ]
                                }
                            ],
                            max_tokens: 1000
                        });
                        const output = response.choices[0]?.message?.content || 'No content extracted.';
                        const cleanedOutput = output.replace(/```/g, '').trim();
                        resolve(cleanedOutput);
                    } catch (error) {
                        reject(error);
                    }
                } else {
                    reject(new Error('File data could not be read.'));
                }
            };
            reader.onerror = () => reject(new Error('Failed to read the image file.'));
            reader.readAsDataURL(file);
        });
    }

    /**
     * Create a new note in your Obsidian vault with the given GPT output.
     */
    async createNewNoteWithContent(markdownContent: string, userFileName: string) {
        const vault = this.app.vault;
        const trimmedContent = markdownContent.trim();
        const finalFileName = userFileName.endsWith('.md')
            ? userFileName
            : `${userFileName}.md`;

        try {
            const newFile = await vault.create(finalFileName, trimmedContent);
            const leaf = this.app.workspace.getLeaf(true);
            await leaf.openFile(newFile);
        } catch (err) {
            console.error('Could not create the new note:', err);
            throw err;
        }
    }
}

class Pic2MarkdownSettingTab extends PluginSettingTab {
    plugin: Pic2Markdown;

    constructor(app: App, plugin: Pic2Markdown) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        // === Add Header ===
        containerEl.createEl('h1', { text: 'Picture to Markdown' });
        
        // === OpenAI API Key Setting ===
        const setting = new Setting(containerEl)
            .setName('OpenAI API Key')
            .setDesc('Enter your OpenAI API Key (must have GPT-4o access).')
            .addText((text) => {
                text
                    .setPlaceholder('sk-...')
                    .setValue(this.plugin.settings.openaiApiKey)
                    .onChange(async (value: string) => {
                        this.plugin.settings.openaiApiKey = value;
                        await this.plugin.saveSettings();
                    });

                // Hide the key by default (masking)
                text.inputEl.type = 'password';
            });

        // Now add the "Show/Hide" button to toggle the password field
        setting.controlEl.createEl('button', { text: 'Show', cls: 'show-hide-btn' }, (btnEl: HTMLButtonElement) => {
            btnEl.addEventListener('click', () => {
                // Access the text input from the setting
                const input = setting.settingEl.querySelector('input');
                if (input instanceof HTMLInputElement) {
                    if (input.type === 'password') {
                        input.type = 'text';
                        btnEl.textContent = 'Hide';
                    } else {
                        input.type = 'password';
                        btnEl.textContent = 'Show';
                    }
                }
            });
        });
    }
}

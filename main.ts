import {
	App,
	Editor,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting
} from 'obsidian';

// Import the new default export from 'openai' (v4+):
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

		// Create an icon in the left ribbon to open the modal
		const ribbonIconEl = this.addRibbonIcon(
			'dice', 
			'Pic2Markdown Plugin', 
			(evt: MouseEvent) => {
				new Pic2MarkdownModal(this.app, this.settings).open();
			}
		);
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// Add the plugin settings tab
		this.addSettingTab(new Pic2MarkdownSettingTab(this.app, this));
	}

	onunload() {
		console.log('unloading Pic2Markdown plugin');
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

	constructor(app: App, settings: Pic2MarkdownSettings) {
		super(app);
		this.settings = settings;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: 'Upload an Image for GPT-4 with Vision' });

		// 1) A text field for the user to enter the new file name
		contentEl.createEl('label', { text: 'Name of the new file:' });
		const fileNameInput = contentEl.createEl('input', { type: 'text' });
		fileNameInput.value = 'Untitled'; // Provide a default

		contentEl.createEl('br');

		// 2) A file input to let the user pick an image
		contentEl.createEl('label', { text: 'Select an image:' });
		const fileInput = contentEl.createEl('input') as HTMLInputElement;
		fileInput.type = 'file';
		fileInput.accept = 'image/*';

		contentEl.createEl('br');

		// 3) A button to process the selected file
		const processButton = contentEl.createEl('button', { text: 'Send to GPT-4o' });

		// 4) A result area for showing the model’s response
		const resultDiv = contentEl.createEl('div', { cls: 'pic2markdown-result' });

		// On click, read user’s chosen file name + image, then process
		processButton.addEventListener('click', async () => {
			const userFileName = fileNameInput.value.trim();
			if (!userFileName) {
				new Notice('Please enter a valid file name.');
				return;
			}

			if (!fileInput.files || fileInput.files.length === 0) {
				new Notice('Please upload an image first!');
				return;
			}

			try {
				const file = fileInput.files[0];
				const gptResult = await this.processImage(file);
				resultDiv.setText(gptResult);

				// Now create the new note, passing in both the GPT text and user’s requested file name
				await this.createNewNoteWithContent(gptResult, userFileName);

			} catch (error) {
				console.error(error);
				new Notice(error.message || 'An error occurred processing the image.');
			}
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	/**
	 * Convert the image into GPT-4 with Vision’s response
	 */
	async processImage(file: File): Promise<string> {
		if (!this.settings.openaiApiKey) {
			throw new Error('OpenAI API key is not set. Please configure it in the plugin settings.');
		}

		// Create the OpenAI client
		const openai = new OpenAI({
			apiKey: this.settings.openaiApiKey,
			dangerouslyAllowBrowser: true,
		});

		// Use FileReader to convert the image to base64 dataURL
		const reader = new FileReader();

		return new Promise((resolve, reject) => {
			reader.onload = async (event) => {
				if (event.target?.result) {
					const imageData = event.target.result as string;

					try {
						// Make sure you have access to the "gpt-4o-mini" model
						const response = await openai.chat.completions.create({
							model: "gpt-4o-mini",
							messages: [
								{
									role: "user",
									content: [
										{
											type: "text",
											text: "Please convert the text in this image to Markdown. Only output the raw markdown. Do not summarize its content. Handle nested lists with tabs not spaces."
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
						const cleanedOutput = output.replace(/```/g, '');
						resolve(cleanedOutput);
					} catch (error) {
						reject(error);
					}
				} else {
					reject(new Error('File data could not be read.'));
				}
			};

			reader.onerror = () => {
				reject(new Error('Failed to read the image file.'));
			};

			reader.readAsDataURL(file);
		});
	}

	/**
	 * Create a new note in your Obsidian vault with the GPT output.
	 * The user’s chosen file name is passed in directly from the input field.
	 */
	async createNewNoteWithContent(markdownContent: string, userFileName: string) {
		const vault = this.app.vault;

		// Append ".md" if missing
		const finalFileName = userFileName.endsWith('.md')
			? userFileName
			: `${userFileName}.md`;

		try {
			// Create the file in the vault
			const newFile = await vault.create(finalFileName, markdownContent);

			// Open the newly created file in a new leaf/pane
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

		new Setting(containerEl)
			.setName('OpenAI API Key')
			.setDesc('Enter your OpenAI API Key (must have GPT-4o access).')
			.addText(text => text
				.setPlaceholder('sk-...')
				.setValue(this.plugin.settings.openaiApiKey)
				.onChange(async (value) => {
					this.plugin.settings.openaiApiKey = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Some Other Setting')
			.setDesc('Example text setting for demonstration.')
			.addText(text => text
				.setPlaceholder('Enter your setting value')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}

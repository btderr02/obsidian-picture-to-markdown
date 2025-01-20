# Obsidian Picture to Markdown 

## Overview
Picture to Markdown for Obsidian converts images of text (handwritten or otherwise) into Markdown files for your Obsidian vault. It uses GPT-4o-mini's vision capabilities via an OpenAI API key.

## Key features
- **Modes**: Single Image, Multi Image (combined note), Bulk (separate notes).
- **API Key**: Requires OpenAI API key with GPT-4o-mini access.

## Usage
1. Click the ribbon icon to upload images.
2. Choose a mode: Single, Multi, or Bulk.
3. Enter or confirm the file name.
4. Click **"Send to GPT-4o"**.

## Settings
- Enter your OpenAI API key in the plugin settings.
    - **Your API key will be stored locally in raw text format inside the plugin.**
- Toggle key visibility with **Show/Hide**.

## Cost
Typical conversion uses ~100,000 input tokens and ~500 output tokens, costing ~1-2 cents per page.

## Model choice 

While GPT-4o and GPT-4o-mini are not the only available models with vision capabilities, they are by far the best. Other cloud models produced worse output with negligable differences in cost with 4o-mini. I saw no discernable difference between 4o and 4o-mini in their output, so I chose to stick to only 4o-mini. Further, local LLMs are simply not sufficient in their current form to preform this task. This may change later down the line. If there is enough interest in adding functionality for other models, I will revist sticking to only 4o-mini. 

Traditional OCR approaches are also not sufficient to convert text to Markdown. This is especially true for handwriting, the use case that I had in mind when starting this project. Even if they worked as intended, OCR models would not be able to format notes into Markdown.

## Feedback
Feel free to open an issue [here](https://github.com/btderr02/obsidian-picture-to-markdown/issues) for bug reports, feature requests, or general suggestions.
# Picture to Markdown Obsidian Plugin Documentation

## Overview
Pic2Markdown converts images of handwritten notes into Markdown files in Obsidian. It uses GPT-4o-mini's vision capabilities via an OpenAI API key.

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

While GPT-4o and GPT-4o-mini are not the only available models with vision capabilities, they are by far the best. Other cloud models produced worse output with negligable differences in cost with 4o-mini. I saw no discernable difference between 4o and 4o-mini in their output, so I chose to stick to only 4o-mini. Further, local LLMs are simply not sufficient in their current form to preform this task. This may change later down the line. If there is sufficient interest to add functionality for other models, I will revist sticking to only 4o-mini. 

Traditional OCR approaches are also not great. This is especially true for handwriting, the use case that I had in mind when starting this project. Even if they worked as intended, OCR models would not be able to format notes into Markdown.
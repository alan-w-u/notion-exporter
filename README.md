# Notion Exporter

The goal of this utility is to efficiently retrieve, preprocess, and convert pages from Notion into well-organized markdown files. This streamlines the process of maintaining Notion-related projects, reducing manual effort and enhancing overall responsiveness.

Please note, this is a **terminal-based** script, with no graphical frontend interface.

## Setup Instructions

Before running the script, the `.env` file must be created and populated. Additionally, a Notion Integration must be created and linked to the respective database, and the Notion API key and database ID need to be retrieved. Once these steps are completed, the script can be executed.

### Template `.env` File

1. Create the `.env` file in the root folder. This serves as a template, and the necessary information will be retrieved in later steps.
```
NOTION_API_KEY = ''
NOTION_DATABASE_ID = ''

WRITE_PATH = ''
```
*Note: Before pushing any code, ensure that the `.env` file is untracked added to the `.gitignore` file to prevent exposing API secrets.*

This [tutorial](https://developers.notion.com/docs/create-a-notion-integration#create-your-integration-in-notion) provides a comprehensive guide for setting up an integration. A summarized version of the steps is outlined below:

### `NOTION_API_KEY` +  [Create and Link an Integration](https://developers.notion.com/docs/create-a-notion-integration#create-your-integration-in-notion)

2. To create an integration, navigate to [Integrations](https://www.notion.so/profile/integrations) and click `New Integration`. 
<br><br>![](https://files.readme.io/402cf3d-new_integrations_1.png)
<br><br>Fill in the **Title**, **Associated workspace**, and set **Type** to `Internal`.
<br><br>![](https://files.readme.io/aef3bab-new_integrations_2.png)
<br><br>After creation, retrieve the `NOTION_API_KEY` from the **Internal Integration Secret** section.
<br><br>![](https://files.readme.io/7ec836a-integrations_3.png)

*Note: Workspace owner privileges are required for this step. If access is needed, consult the relevant parties to either gain access or have them create the integration.*

3. To link the integration to the database, navigate to the database. Click the `...` menu on the top-right, hover over **Connections**, search for the `title` of the integration created in the previous step, and select it.
<br><br>![](https://files.readme.io/fefc809-permissions.gif)

### `NOTION_DATABASE_ID`

4. To retrieve the database ID, navigate to the database and locate it in the URL.
<br><br>![](https://files.readme.io/64967fd-small-62e5027-notion_database_id.png)
<br>e.g. h<span>ttps://www.notion.so/**`1b4524ea00fa80ccb6d4c73e660c31a5`**?v=1b4524ea00fa81ed8ab5000c6b0b1b89

### `WRITE_PATH`

5. Write the relative path from the script file to where notebook files should be stored. The `path` library is used to safely resolve paths.
<br>e.g. `../notebooks`

### Populate `.env` File

6. With the `NOTION_API_KEY`, `NOTION_DATABASE_ID`, and `WRITE_PATH` obtained, populate the `.env`. Remember to enclose them in quotation marks (either single or double) to treat them as `strings`.
```
NOTION_API_KEY = '...'
NOTION_DATABASE_ID = '...'

WRITE_PATH = '...'
```

## Script Execution

1. Navigate into the `src` folder (location of the script file)
```
cd src
```

2. Run the script (replace _____ with the name of the script file)
```
npx ts-node _____
```

## Project Details

### Files

`notionService.ts` — Handles business logic and interacts with APIs

`notionUtil.ts` — Contains utility functions for general Notion conversion purposes independent of business logic

`markdown.ts` — Converts content into markdown format

`fileSystem.ts` — Manages file storage operations

`spinner.ts` — Displays a terminal spinner and tracks/shows script runtime and API requests

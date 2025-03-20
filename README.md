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
*Note: Before pushing any code, ensure that the `.env` file is untracked and added to the `.gitignore` file to prevent exposing API secrets.*

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
<br>*e.g. h<span>ttps://www.<span>notion.so/**`1b4524ea00fa80ccb6d4c73e660c31a5`**?v=1b4524ea00fa81ed8ab5000c6b0b1b89*

### `WRITE_PATH`

5. Write the relative path from the script file to where output files should be stored.
<br>*e.g. `../notebooks` (good default option)*

### Populate `.env` File

6. With the `NOTION_API_KEY`, `NOTION_DATABASE_ID`, and `WRITE_PATH` obtained, populate the `.env`. Remember to enclose them in quotation marks (either single or double) to treat them as `strings`.
```
NOTION_API_KEY = '...'
NOTION_DATABASE_ID = '...'

WRITE_PATH = '...'
```

## Script Execution

1. Install `npm` dependencies (omit this step if previously completed)
```
npm install
```

2. Navigate into the `src` folder (location of the script file)
```
cd src
```

3. Run the script (replace _____ with the name of the script file)
```
npx ts-node _____
```

## Project Details

### Files

`notionService.ts` — Handles business logic and interacts with APIs

`notionUtil.ts` — Contains utility functions for general Notion conversion purposes

`markdown.ts` — Converts content into markdown format

`fileSystem.ts` — Manages file storage operations

`spinner.ts` — Displays a terminal spinner and tracks/shows script runtime and API requests

### Notion API

The Notion API can be utilized to fetch/parse data using either a `databaseId`, `pageId`, or `blockId`. It should be noted that `pageId = blockId` and they can be used interchangeably with regards to Notion APIs. Requests to the Notion API return page data as `JSON` files. However, a single request/file does not contain all the content of the page, but rather than top-most 'layer' of the page data. Using additional API requests and the metadata provided by this `JSON` file, deeper layers of the page can be reached.

The Notion API treats a Notion page very similarly to a webpage DOM. Imagine the below `HTML` block as a Notion page:

```html
<div className="page">
  <div className="section1">
    <p>Item 1</p>
    <p>Item 2</p>
    <p>Item 3</p>
  </div>
  <div className="section2"></div>
  <div className="section3"></div>
</div>
```

Using a `pageId/blockId`, the top-most layer of the DOM can be retrieve to return `<div className="page">`. After this, an additional API request can be used to find the children of that block and "drill into" the page. This would return `<div className="section1">`, `<div className="section2">`, and `<div className="section2">`. This process can be repeated to continue drilling each block until no children remain.

This structure is very akin to a **`general tree data structure`**, thus similar processes to traverse a tree can be utilized.

![](https://media.geeksforgeeks.org/wp-content/uploads/20200324122406/GenricTree.png)

### Core Logic

The exporter utilizes a `databaseId` to fetch and iterate over all the `pageId`s in the database. For each page, it utilizes a modified pre-order traversal to fetch all the page data and order it correctly. Using the convenient `type` and `annotations` properties, the correct styling can be applied via a mapped function for each block type.

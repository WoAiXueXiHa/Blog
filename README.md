# Vect Blog Prototype

Local prototype of a two-mode personal blog: a read-only browser terminal and a visual reading mode. The public site is not deployed.

## Run

```bash
npm install
npm run dev
```

Open the local URL printed by Astro. `npm run build` checks the static build; `npm run preview` serves that build locally.

## Content

Posts live in `src/content/posts/tech/` and `src/content/posts/notes/`. Open this project as an Obsidian vault, or edit a Markdown file in your existing vault and copy the publishable version into the appropriate folder. Saving a post while the development server runs refreshes the local preview.

Each post needs frontmatter with `title`, `date`, `category` (`tech` or `notes`), `description`, and optional `draft`. The two Go posts are local review samples copied from the knowledge base; their display dates and summaries are prototype metadata, not publication dates. Obsidian wiki links and private navigation lines were removed from the copies. The Gitee image URLs were kept as provided.

The `About` text and terminal `who am i` output are placeholders pending the author's review. Weather lookup, publishing automation, and public hosting are outside this prototype.

## Terminal commands

`help`, `ls`, `cd`, `pwd`, `tree`, `cat`, `who am i`, and `clear` are implemented in the browser against a read-only virtual directory rooted at `/Vect`. No visitor command runs on the host system.

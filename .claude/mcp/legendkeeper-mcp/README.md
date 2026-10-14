# LegendKeeper MCP server

Lets Claude read and edit your [LegendKeeper](https://www.legendkeeper.com) worlds: browse the tree, search, read pages, maps and timelines, write pages in Markdown, set infobox facts, drop map pins and add timeline events. Built on the official `@legendkeeper/sdk` (v4.1, API v3).

## What Claude gets

| Tool | Does |
| --- | --- |
| `list_worlds` | The worlds (projects) this server can reach |
| `browse` | The resource tree as an outline, a branch of it, or everything with a tag |
| `search` | Full-text search over names, aliases and page content |
| `list_tags` | Every tag with its usage count |
| `get_resource` | A resource's path, tags, documents, sidebar and main page |
| `read_document` | A page as Markdown, a map's pins, a timeline's events, a board's text |
| `create_resource` | New character/place/... with a Markdown page and an infobox of facts |
| `update_resource` | Rename, retag, re-icon, hide/lock |
| `move_resource` | Re-parent or reorder |
| `delete_resource` / `restore_resource` | Delete (optionally with children) and undo |
| `write_page` | Append, prepend or replace page content in Markdown |
| `set_facts` | Add/update/remove key-value facts in the infobox or sidebar |
| `add_map_pin` | Pin by pixel on the map image or by lat/lng, linked to a page |
| `add_timeline_event` | Event on a named lane, dates in the timeline's own calendar |
| `upload_image` | Copy an image from a URL into the world so pages can show it |
| `api_request` | Any other v3 API route (boards, calendars, regions, members, ...) |

Set `LEGENDKEEPER_READ_ONLY=1` and only the first six tools plus GET-only `api_request` are exposed.

### Pages as Markdown

Pages are read and written as GitHub-flavoured Markdown with a few extras:

- `[[Exact Name]]` or `[Label](lk://resources/<id>)` → a mention (a link to that page)
- `> [!note]`, `[!info]`, `[!success]`, `[!warning]`, `[!error]` → callouts (Obsidian aliases like `[!tip]` work too)
- `> [!secret]` → GM-only content hidden from players
- `> [!expand] Title` → a collapsible section
- `- [ ]` / `- [x]` checklists, tables, code blocks, `<u>`, `<sub>`, `<sup>`
- `![alt](url)` on its own line → an image (the URL must come from `upload_image`)

Blocks Markdown can't express (infoboxes, collections, meters, embeds, layouts) appear as
`<!-- lk:keep id=… kind=infobox | Facts: Age=827 -->` lines. Leave a line in place and that block stays put when Claude rewrites the page. `write_page` in replace mode refuses to drop rich blocks unless told to, and checks the page version so edits you made in the app meanwhile are never overwritten.

## 1. Get API keys

In LegendKeeper, open each world → **Project Settings → Developers → API Keys** and create a key. Use the **Admin** role if you want Claude to create top-level pages and read tags. The secret is shown once. API keys need the project owner to be on a paid plan (trials don't count).

Each key reaches one world. Configure as many as you like:

```sh
LEGENDKEEPER_KEY_OOO=lk_...        # world "ooo"
LEGENDKEEPER_KEY_EBERRON=lk_...    # world "eberron"
LEGENDKEEPER_DEFAULT_WORLD=ooo     # optional
```

(or `LEGENDKEEPER_API_KEY` for a single world, or `LEGENDKEEPER_WORLDS='{"ooo":"lk_..."}'`).

## 2a. Run it locally (Claude desktop app, Claude Code)

```sh
npm install
npm run build
```

**Claude Code:**

```sh
claude mcp add legendkeeper -e LEGENDKEEPER_KEY_OOO=lk_... -- node /path/to/legendkeeper-mcp/dist/index.js
```

**Claude desktop app** — add to `claude_desktop_config.json` (Settings → Developer → Edit Config) and restart the app:

```json
{
  "mcpServers": {
    "legendkeeper": {
      "command": "node",
      "args": ["/path/to/legendkeeper-mcp/dist/index.js"],
      "env": { "LEGENDKEEPER_KEY_OOO": "lk_..." }
    }
  }
}
```

Local servers configured this way work in the desktop app and Claude Code, not in claude.ai on the web or phone. For those, use 2b.

## 2b. Run it on a server (claude.ai on web, desktop and mobile)

claude.ai connects to custom connectors from Anthropic's cloud, so the server needs a public HTTPS address. On a home server with Docker:

```sh
cp .env.example .env            # add your keys and set MCP_AUTH_TOKEN=$(openssl rand -hex 32)
docker compose up -d --build    # serves http://127.0.0.1:8787/mcp
```

Give it a public HTTPS URL without opening router ports, for example:

- **Cloudflare Tunnel:** create a tunnel in the Cloudflare dashboard, route a hostname to `http://legendkeeper-mcp:8787`, put the token in `.env` as `CLOUDFLARE_TUNNEL_TOKEN`, then `docker compose --profile tunnel up -d`.
- **Tailscale Funnel:** `tailscale funnel 8787`.

Check it: `curl https://<your-host>/healthz`.

Then add it to claude.ai as a custom connector ([how](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp)):

- URL: `https://<your-host>/mcp`
- Authentication: no sign-in (OAuth off), with a request header `Authorization: Bearer <your MCP_AUTH_TOKEN>`

The server refuses to start in HTTP mode without `MCP_AUTH_TOKEN` (min. 24 characters); requests without the right token get 401. It is stateless, so restarts are harmless.

| Variable | Default | |
| --- | --- | --- |
| `MCP_TRANSPORT` | `stdio` (`http` in Docker) | `http` serves Streamable HTTP |
| `PORT` / `HOST` / `MCP_PATH` | `8787` / `0.0.0.0` / `/mcp` | |
| `MCP_AUTH_TOKEN` | — | Required for `http` |
| `LEGENDKEEPER_READ_ONLY` | `0` | `1` hides every write tool |
| `LEGENDKEEPER_BASE_URL` | production | For a proxy or mock |

## Good to know

- **Permissions follow the key.** A Member key can only do what a member can; Claude gets a clear error otherwise.
- **Rate limits:** LegendKeeper allows 120 writes a minute per key. The SDK retries short waits automatically; big imports are better done as a script (see the `legendkeeper-sdk` skill).
- **Deletes are recoverable** with `restore_resource` (Admin key), and the server tells Claude to confirm before deleting.
- `upload_image` only fetches public `http(s)` URLs; it refuses private and local addresses, so the server can't be used to probe your home network.

## Development

```sh
npm test        # Markdown round-trips + every tool end to end against a mock API that validates bodies with the real OpenAPI schemas
npm run build
```

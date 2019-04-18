# story-scanner

Simple utility to scan provided paths as args for `.js` and report which
have associated `.stories.js` files in the same path.

`npm install story-scanner --global`

## Usage

-   Generate a `story-coverage.html`:

    `story-coverage src/components src/containers`

-   Respond with contents of `story-coverage.html` over HTTP:

    `story-coverage src/components src/containers --listen`

The `--listen` flag starts an HTTP server and a WebSocket server.
WebSocket connection is used to trigger a reload on all clients. The
WebSocket connection is started on port that is provided + 1 (e.g. if
`-p` is `6060`, then the WS port would be `6061`).

## Arguments

-   `--filename, -f` (default: `story-coverage.html`) -- outputs HTML to
    a file

-   `--listen, -l` -- starts a HTTP server

-   `--port, -p` (default: `6060`) -- sets the port for HTTP server to listen on


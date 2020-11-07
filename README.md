# BonPose

This app helps you keep your back straight.


## Development

You need to have [Node 12][node-12] with [Yarn v1][yarn-1] installed

Install the dependencies...

```sh
yarn
```

...then start the dev server:

```sh
yarn dev
```

The app runs at [localhost:5000](http://localhost:5000).

You may need to install a plugin for your editor to get syntax highlighting and
other features.

## Building and running in production

To create an optimized version of the app:

```bash
yarn build
```

You can run the newly built app with `yarn start`.

## Single-page app mode

By default, [sirv][sirv] will only respond to requests that match files in
`public`. This is to maximize compatibility with static fileservers, allowing
you to deploy your app anywhere.

If you're building an SPA with multiple routes, sirv needs to be able to respond
to requests for *any* path. You can make it so by editing the `"start"` command
in package.json:

```json5
{
  // ...
  "scripts": {
    // ...
    "start": "sirv public --single"
  }
}
```

[node-12]: https://nodejs.org/download/release/latest-v12.x/
[yarn-1]: https://classic.yarnpkg.com/lang/en/
[sirv]: https://github.com/lukeed/sirv

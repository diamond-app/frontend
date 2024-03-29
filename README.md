# Diamond App

![DeSo Logo](src/assets/diamond/camelcase_logo.svg)

## About DeSo

DeSo is a blockchain built from the ground up to support a fully-featured
social network. Its architecture is similar to Bitcoin, only it supports complex
social network data like profiles, posts, follows, creator coin transactions, and
more.

[Read about the vision](https://docs.deso.org/#the-ultimate-vision)

## About This Repo

Documentation for this repo lives on docs.deso.org. Specifically, the following
docs should give you everything you need to get started:

- [DeSo Code Walkthrough](https://docs.deso.org/code/walkthrough)
- [Setting Up Your Dev Environment](https://docs.deso.org/code/dev-setup)
- [Making Your First Changes](https://docs.deso.org/code/making-your-first-changes)

## Start Coding

The quickest way to contribute changes to DiamondApp is the following these steps:

1. Open frontend repo in Gitpod

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/diamond-app/frontend)

You can use any repo / branch URL and just prepend `https://gitpod.io/#` to it.

2. If needed, login to your github account

3. Set the correct `lastLocalNodeV2` to `"https://api.tijn.club"` in your browser Local Storage for the gitpod preview URL

4. Create a new branch to start working

To commit / submit a pull reqest from gitpod, you will need to give gitpod additional permissions to your github account: `public_repo, read:org, read:user, repo, user:email, workflow` which you can do on the [GitPod Integrations page](https://gitpod.io/integrations).

# Testing and Debugging Twitter Sync

Twitter sync requires the development build to be served on allowed domains that
can communicate via postMessage with the [setu deso](https://web3setu.com/) domain.

- The easiest way to get started is by installing a reverse proxy tool called [mitmproxy](https://mitmproxy.org/). See their
  website for the installation instructions for your platform. On mac you can install it with homebrew:

  ```sh
  brew install mitmproxy
  ```

- Edit your hosts file to route the dev.diamondapp.com domain to localhost:

  ```sh
  sudo vi /etc/hosts

  # add this line
  127.0.0.1 dev.diamondapp.com
  ```

- Run your local angular dev server with the `--disable-host-check` flag:

  ```sh
  #NOTE: you may need to install ng globally: npm i -g @angular/cli
  ng serve --disable-host-check
  ```

  This should start a dev server at http://localhost:4200

- Run mitmproxy in reverse proxy mode over https:

  ```sh
  mitmproxy -p 443 --mode reverse:http://localhost:4200
  ```

- Load https://dev.diamondapp.com in google chrome.

  - If you get an SSL error that will not allow you to proceed you will need
    to reset the HSTS settings for the diamondapp.com domain. Do that by
    navigating to this settings page chrome://net-internals/#hsts and in the
    **Delete domain security policies** input, type `diamondapp.com` (WITHOUT
    the `dev` subdomain) and click delete. You should now be able to reload
    https://dev.diamondapp.com and proceed after clicking the "Advanced" button.

- Open dev tools and update the local storage value for `lastLocalNodeV2`
  to point to https://node.deso.org

- Reload the page again and if everything was done properly you should now
  be able to see your local development copy being served on
  https://dev.diamondapp.com

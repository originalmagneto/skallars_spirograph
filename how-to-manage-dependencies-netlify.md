---
title: "Manage build dependencies"
description: "Specify dependencies for your project so that our platform can install required languages and software before running a build."
---

When you trigger a build on Netlify, our build system starts a Docker container to build your site. Before running your build command, the build system will search for instructions about required languages and software needed to run your command. These are called _dependencies_, and how you declare them depends on the languages and tools used in your build.

Follow the guidelines below to specify your required dependencies, and Netlify will install them before running your build. Any executables from these dependencies will be made available from the PATH for the remainder of the build.

## Node.js and JavaScript

A build's Node.js version is initially determined by the [default version](/build/configure-builds/available-software-at-build-time) preinstalled on the site's selected build image. We pin the site to that version so your builds won't change even if the build image's defaults change.

You can choose the Node.js version we use to build your site in the following ways:

- Navigate to 
### NavigationPath Component:

Project configuration > Build & deploy > Continuous deployment > Dependency management
 in the Netlify UI and select from the major Node.js versions that Netlify currently supports. Once you change the version, you need to redeploy your site for it to take effect. Note that a `NODE_VERSION` environment variable, `.node-version` file, or `.nvmrc` file will override this UI setting.
- Set a `NODE_VERSION` [environment variable](/build/configure-builds/environment-variables) with any released version of Node.js or any valid string that [nvm](https://github.com/nvm-sh/nvm#nvmrc) understands. You can either set a specific version or set a major version, such as the number `22` for the latest version of Node.js 22.x.
- Add a `.node-version` or [`.nvmrc`](https://github.com/nvm-sh/nvm#nvmrc) file to the site's [base directory](/build/configure-builds/overview#definitions) in your repository. The file can include any released version of Node.js or any valid string that [nvm](https://github.com/nvm-sh/nvm#nvmrc) understands. You can either set a specific version or set a major version, such as the number `22` for the latest version of Node.js 22.x.

The version of Node.js you use is dynamically fetched using `nvm` and then [cached](/build/configure-builds/manage-dependencies#dependency-cache) to speed up subsequent builds.

If you are using the Netlify CLI to run a build locally, make sure the Node.js version installed in your local environment matches the version set for your build on Netlify. If the versions don't match, you may encounter errors.

### Tip - What about the Node.js version for functions?

Typically, the functions runtime Node.js version automatically matches the version used for the build. If you need to customize the Node.js version for your functions, use the `AWS_LAMBDA_JS_RUNTIME` environment variable. Visit our docs on [Node.js version for runtime](/build/functions/optional-configuration/?fn-language=js#node-js-version-for-runtime-2) to learn more.

### Node.js environment

By default, Netlify's build system does not set any value for `NODE_ENV` (so it defaults to `undefined`). You can change this value by setting a `NODE_ENV` [environment variable](/build/configure-builds/environment-variables).

### Caution - Dependencies and production

If you set the `NODE_ENV` to `production`, any `devDependencies` in your `package.json` file will _not_ be installed for the build.

### JavaScript dependencies

If your build requires any JavaScript dependencies, you must list these in a `package.json` saved in the site's [base directory](/build/configure-builds/overview#definitions) in your repository. You can visit the npm docs to learn [how to create a package.json file](https://docs.npmjs.com/creating-a-package-json-file).

### Tip - Tip

If you're having trouble linking to other repositories in your `package.json`, visit the [repository permissions and linking]( /build/git-workflows/repo-permissions-linking#access-other-repositories-at-build) doc for more information.

#### npm

[npm](https://www.npmjs.com/) comes preinstalled with Node.js, so any build scripts using `npm run` will work automatically. By default, if your site's repository does not include a `yarn.lock`, `pnpm-lock.yaml` or `bun.lockb` file, we will run `npm install` to install the dependencies listed in your `package.json`.

You can customize your npm use with the following [environment variables](/build/configure-builds/environment-variables):

- **`NPM_VERSION`:** variable that defaults to the version preinstalled with your version of Node.js. Accepts any released version number.
- **`NPM_FLAGS`:** used to indicate the flags to pass to the `npm install` command. For example, you could pass the `--global` flag to make installed packages available outside your working directory. Learn more about npm flags in the [npm docs](https://docs.npmjs.com/cli/v8/using-npm/config#command-line-flags).
- **`NPM_TOKEN`:** used for authentication when installing private npm modules. Visit our Forums for a verified Support Guide on configuration details when [using private npm modules on Netlify](https://answers.netlify.com/t/common-issue-using-private-npm-modules-on-netlify/795).

#### pnpm

Netlify supports [pnpm](https://pnpm.io/) for Node.js 16.9.0 and later.

If your site's base directory includes a `pnpm-lock.yaml` file, we will run `pnpm install` to install the dependencies listed in your `package.json`.

To specify a pnpm version, you can edit your `package.json` file:

```json
"packageManager": "pnpm@6.3.2"
```

This tells Corepack to use and download your preferred pnpm version instead of the [default version](/build/configure-builds/available-software-at-build-time#tools) that Netlify sets.

Note that based on [Corepack limitations](https://github.com/nodejs/corepack/issues/95), you cannot use [`semver`](https://docs.npmjs.com/cli/v6/using-npm/semver) to specify a range of versions for this package manager.

In certain scenarios, you must pass additional flags to the `pnpm install` command. For example, some frameworks such as Nuxt 3 and Next.js require that you modify the `pnpm install` command. To avoid import issues with pnpm and these frameworks, use the `PNPM_FLAGS` environment variable and set it to `--shamefully-hoist`.

#### Yarn

Netlify can detect and install [Yarn](https://yarnpkg.com) and then use it to install your project's dependencies. If you commit a `yarn.lock` file to your site's repository or if your `packageManager` property specifies Yarn, Netlify will install Yarn and then run the `yarn` command to install the dependencies specified in your `yarn.lock` file.

By default, Netlify will use the Yarn version preinstalled with your initial [build image](/build/configure-builds/overview#build-image-selection). 

Note that based on [Corepack limitations](https://github.com/nodejs/corepack/issues/95), you cannot use [`semver`](https://docs.npmjs.com/cli/v6/using-npm/semver) to specify a range of versions for this package manager.

To specify a different Yarn version:

- You can edit your `package.json` file:
  ```json
    "packageManager": "yarn@3.2.4"
  ```
- Or, you can leverage Yarn's way of vendoring a specific version by setting a [`yarnPath`](https://yarnpkg.com/configuration/yarnrc#yarnPath) inside a [`.yarnrc.yml` file](https://yarnpkg.com/configuration/yarnrc).
  ```yaml
  yarnPath: .yarn/releases/yarn-3.2.4.cjs
  nodeLinker: node-modules
  ```

You can also customize your Yarn use with the following [environment variables](/build/configure-builds/environment-variables):

- **`YARN_FLAGS`:** used to indicate the flags to pass to the `yarn` command. Includes `--ignore-optional` by default. You can override this by adding `--no-ignore-optional` to this variable.
- **`YARN_NPM_AUTH_TOKEN`:** used for authentication when installing private npm modules.
- **`NETLIFY_USE_YARN`:** deprecated variable that is supported but no longer recommended; undefined by default. If `true`, Netlify will install and run Yarn. If `false`, we will use npm or pnpm. If left unset, we will run Yarn if the site's `package.json` specifies yarn as the package manager or if a `yarn.lock` file is present.
- **`YARN_VERSION`:** deprecated variable that is supported but no longer recommended; defaults to the version preinstalled with your initial build image. Accepts any released version number. We recommend setting the version in `package.json` or through a `yarnPath` in `.yarnrmc.yml` instead.

### Caution

<code>.yarnrc.yml</code></span>">
To build your project on Netlify with [Yarn 2.0.0 or later](https://github.com/yarnpkg/berry), you must add `nodeLinker: node-modules` to a [`.yarnrc.yml` file](https://yarnpkg.com/configuration/yarnrc), which is generally stored in your repository root. Netlify depends on the `node_modules` folder tree that's generated with this setting. [Plug'n'Play](https://yarnpkg.com/features/pnp) is not currently supported on Netlify.

#### Bun

Netlify can detect when your project is using [Bun](https://bun.sh/) and then use it to install your project's dependencies. If you commit a `bun.lockb` file to your site's repository, Netlify will run the `bun install` command to install the dependencies specified in your `bun.lockb` file.

All builds will use the version [pre-installed in our build image](/build/configure-builds/available-software-at-build-time).

You can also customize your Bun use with the following [environment variables](/build/configure-builds/environment-variables):

- **`BUN_FLAGS`:** used to indicate the flags to pass to the `bun install` command.
- **`BUN_VERSION`:** to set the version of Bun we use for the build. You can use any released version of Bun.

#### Bower

If your repository includes a `bower.json` file in the [base directory](/build/configure-builds/overview#definitions), we'll automatically run `bower install --config.interactive=false` against it to install your Bower dependencies. This is _in addition to_ running any other requisite dependency management commands as described in this doc.

## Go

A build's initial Go version is determined by the [default version](/build/configure-builds/available-software-at-build-time) for the site's build image. You can change the Go version we use to build your site in the following ways:

- Set a `GO_VERSION` [environment variable](/build/configure-builds/environment-variables) with any released version of Go. You can also use a partial version, such as `1.20`, to indicate the latest version of `1.20`.
- Add a `.go-version` file to the site's [base directory](/build/configure-builds/overview#definitions) in your repository. The file can include any released version of Go.

### Note

<code>.go-version</code> overrides <code>GO_VERSION</code></span>">
Note that if your site has both a `.go-version` file and a `GO_VERSION` environment variable, the `.go-version` file takes precedence.

We recommend matching your local development environment's Go version to your selected build image's Go version. You can use any version of Go that's available on the [Go downloads page](https://golang.org/dl/).

The configured Go version is also used when compiling [Go serverless functions](/build/functions/lambda-compatibility/?fn-language=go) during the build.

## PHP

You can choose the PHP version we use to build your site by setting a `PHP_VERSION` [environment variable](/build/configure-builds/environment-variables). We recommend matching your local development environment's PHP version to a version that your selected build image supports. For a list of supported versions, refer to the [available software at build time](/build/configure-builds/available-software-at-build-time) doc.

### PHP dependencies

Add your PHP dependencies to a [`composer.json` file](https://getcomposer.org/doc/01-basic-usage.md). Dependencies listed in `composer.json` are automatically installed with Composer, which is included in all build images.

## Python

The [default Python version](/build/configure-builds/available-software-at-build-time) is determined by the site's selected build image.

You can choose the Python version we use to build your site in one of the following ways:

- Set a `PYTHON_VERSION` [environment variable](/build/configure-builds/environment-variables).
- Add a `runtime.txt` file to the site's [base directory](/build/configure-builds/overview#definitions) in your repository. The file must include the version number _only_: `x.y`, with no trailing newline.
- Use [Pipenv](https://docs.pipenv.org/basics/#specifying-versions-of-python) to specify a version and save it to a `Pipfile` in the site's [base directory](/build/configure-builds/overview#definitions) in your repository.

### Note

<code>runtime.txt</code> overrides <code>Pipfile</code></span>">
If the site's base directory includes both a `runtime.txt` file and a `Pipfile`, Netlify will use the version specified in `runtime.txt`.

The [list of supported versions](/build/configure-builds/available-software-at-build-time) depends on the site's selected build image.

### Python dependencies

If your build requires any Python dependencies, you must provide a list of these for installation using [pip](#install-via-pip) or [Pipenv](#install-via-pipenv).

#### Install using pip

If you manage your Python dependencies using [pip](https://pip.pypa.io/en/stable/cli/pip_install/), you can generate a list of them by running the following command in the site's [base directory](/build/configure-builds/overview#definitions) in your repository:

```bash
pip freeze > requirements.txt
```

This creates a `requirements.txt` file that Netlify will use to install your dependencies by running `pip install`. Refer to the pip docs for more details about the [requirements file format](https://pip.pypa.io/en/stable/reference/requirements-file-format/).

#### Install using Pipenv

If you manage your Python dependencies using [Pipenv](https://pipenv-fork.readthedocs.io/en/latest/basics.html), be sure to commit your `Pipfile` to the site's [base directory](/build/configure-builds/overview#definitions) in your repository. Netlify will run `pipenv install` to install your dependencies. If you also commit your `Pipfile.lock`, this will ensure that `pipenv install` installs the same exact versions of your dependencies on Netlify as it does locally.

### Note

<code>requirements.txt</code> overrides <code>Pipfile</code></span>">
If the site's base directory includes both a `requirements.txt` file and a `Pipfile`, Netlify will run `pip install` to install the dependencies in `requirements.txt`, and ignore the dependencies in the `Pipfile`.

## Ruby

A build's Ruby version is initially determined by the [default version](/build/configure-builds/available-software-at-build-time) preinstalled on the site's selected build image. We pin the site to that version so your builds won't change even if the build image's defaults change.

You can choose the Ruby version we use to build your site in two different ways:

- Set a `RUBY_VERSION` [environment variable](/build/configure-builds/environment-variables).
- Add a `.ruby-version` file to the site's [base directory](/build/configure-builds/overview#definitions) in your repository. This will also tell any other developer using the repository which version of Ruby it depends on.

### Caution

No newlines in <code>.ruby-version</code></span>">
The `.ruby-version` file must include the version number _only_: `x.y.z`, with no trailing newline.

Both methods above will accept any released version of Ruby, or any valid string that [RVM](https://github.com/rvm/rvm) understands. We recommend specifying a version of Ruby that matches your local development environment.

If the version you select is preinstalled in your site's selected build image, it will be available immediately. If not, your selected version will be installed using `rvm` and then [cached](/build/configure-builds/manage-dependencies#dependency-cache) to speed up subsequent builds.

### Ruby dependencies

If your build requires any Ruby dependencies, you must list these in a `Gemfile` saved in the site's [base directory](/build/configure-builds/overview#definitions) in your repository. We use [Bundler](https://bundler.io/) to install the dependencies in that file. You can visit the Bundler docs to learn [how to manage Ruby dependencies with Bundler](https://bundler.io/v2.0/guides/using_bundler_in_applications.html).

If you run the `bundle install` command locally, Bundler will create a `Gemfile.lock` to record the gem names and versions installed. If you commit this file to the site's [base directory](/build/configure-builds/overview#definitions) in your repository, we will install the exact versions specified in your `Gemfile.lock`.

## Rust

Although [rustup](https://github.com/rust-lang/rustup/blob/master/README.md) and [cargo](https://doc.rust-lang.org/cargo/) are preinstalled, Netlify doesn't install a default Rust toolchain.

You must specify the Rust toolchain used to build your site in one of the following ways:

- Add a [`rust-toolchain`](https://rust-lang.github.io/rustup/overrides.html#the-toolchain-file) file to the site's [base directory](/build/configure-builds/overview#definitions-1) in your repository. This is the recommended option. When a `rust-toolchain` file is present, cargo installs the toolchain when it first executes, for example, on `cargo build`.
- Include a [toolchain install](https://rust-lang.github.io/rustup/concepts/toolchains.html) command as part of your site's build command. Use the syntax `rustup toolchain install <toolchain>`, for example: `rustup toolchain install stable`.

The build image supports any toolchain that rustup can install. The selected Rust toolchain is [cached](/build/configure-builds/manage-dependencies#dependency-cache) to speed up subsequent builds. [Crates](https://doc.rust-lang.org/book/ch07-00-managing-growing-projects-with-packages-crates-and-modules.html) are cached in `~/.cargo/registry`, and compilation assets are cached in `target` if your working directory has a `Cargo.toml` or `Cargo.lock` file.

### Rust dependencies

Include any Rust dependencies in a `Cargo.toml` manifest file in the base directory in your repository. If you also commit a `Cargo.lock`, this will ensure that cargo installs the same exact versions of your Rust dependencies on Netlify's build image as it does locally. Dependencies aren't installed automatically. Instead cargo fetches them when `cargo doc` or `cargo build` executes as part of the build command.

## Swift

A default Swift version does not come preinstalled on a site's selected [build image](/build/configure-builds/overview#build-image-selection). Instead, at the time of the first build, Netlify installs your specified Swift version in the build container.

You can choose the Swift version we use to build your site in two different ways:

- Set a `SWIFT_VERSION` [environment variable](/build/configure-builds/environment-variables).
- Add a `.swift-version` file to the site's [base directory](/build/configure-builds/overview#definitions) in your repository. This will also tell any other developer using the repository which version of Swift it depends on.

Both methods above will accept any Swift version that [swiftenv](https://github.com/kylef/swiftenv) can install that is later than Swift 4.x. Versions 4.x and earlier aren't supported due to incompatible shared libraries. We recommend specifying a version of Swift that matches your local development environment.

### Note - Default Swift version

If no `SWIFT_VERSION` environment variable is set and no `.swift-version` file is present but a `Package.swift` file exists in the site's [base directory](/build/configure-builds/overview#definitions-1) in the repository, Netlify installs a default Swift version determined by the site's selected [build image](/build/configure-builds/overview#build-image-selection).

Your selected version will be initially installed using `swiftenv` and then [cached](/build/configure-builds/manage-dependencies#dependency-cache) to speed up subsequent builds.

### Swift dependencies

If your build requires any Swift dependencies, you must list these in a `Package.swift` manifest file saved in the site's [base directory](/build/configure-builds/overview#definitions-1) in your repository. During the build, our build system runs the `swift build` command, using [Swift Package Manager](https://swift.org/package-manager/) to install the dependencies and exact versions specified in `Package.swift`. For more information about managing dependencies with the manifest file, visit the [Swift Package Manager documentation](https://www.swift.org/documentation/package-manager/#importing-dependencies).

## Build image defaults

Netlify's [build images](/build/configure-builds/overview#build-image-selection) have default preinstalled versions for many languages and tools. For a full list of defaults and more information on how to manage versions, refer to our [available software at build time](/build/configure-builds/available-software-at-build-time) doc.

Not sure what build image your project uses? You can find out in the Netlify UI, by navigating to 
### NavigationPath Component:

Project configuration > Build & deploy > Continuous deployment > Build image selection
. You can also find all of the software versions your build uses in your site's [deploy logs](/deploy/deploy-overview#deploy-log).

## Dependency cache

The first build you do can take some time while we install all of your dependencies. After the initial build, we'll cache the dependencies so we don't have to install them every time you push an update. This is intended to make subsequent builds faster.

If you change your dependency requirements, the next build will re-run the installation command which may update cached dependencies if needed. It isn't guaranteed a change will take place if the previous dependencies still satisfy the installer, though! You can check which directories are cached by searching for `$NETLIFY_CACHE_DIR` in the `run-build-functions.sh` file for your site's selected [build image](/build/configure-builds/overview#build-image-selection).

If a build fails, it's worth retrying with a cleared build cache to check if this works better. You can do this by [deploying the latest branch commit](/deploy/manage-deploys/manage-deploys-overview#retry-deploy-from-latest-branch-commit) with the clear cache option.

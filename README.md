# CSS Modules to Tailwind CSS

This is a tool to convert css-modules to tailwind-css

<p>
  <img src="./logo.svg" alt="Tailwind Tool">
</p>
<p>
    <a href="https://www.npmjs.com/package/css-modules-to-tailwind"><img src="https://img.shields.io/npm/dm/css-modules-to-tailwind?style=flat-square" alt="Total Downloads"></a>
    <a href="https://www.npmjs.com/package/css-modules-to-tailwind"><img src="https://img.shields.io/bundlephobia/minzip/css-modules-to-tailwind?style=flat-square" alt="Latest Release"></a>
    <a href="https://github.com/shiyangzhaoa/css-modules-to-tailwind/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/css-modules-to-tailwind?style=flat-square" alt="License"></a>
</p>

## About

  - [CSS Modules](https://github.com/css-modules/css-modules)
  - [Tailwind CSS](https://tailwindcss.com/)

## How it works

It uses [jscodeshift](https://github.com/facebook/jscodeshift) and [postcss](https://github.com/postcss/postcss).

If you have a component named 'User'(src/index.tsx):
```tsx
import style form 'index.module.css';

const User = () => (
  <div className={style.header}>
    <div className={style.user}>
      <img className={style.avatar} src={creator.avatar} alt="avatar" />
      <span className={style.username}>{creator.username}</span>
    </div>
    <div className={style.channelName}>{channel.name}</div>
  </div>
);
```
And used css-modules:
```css
.header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.user {
  display: flex;
  align-items: center;
  font-weight: bold;
}

.avatar {
  width: 0.625rem;
  height: 0.625rem;
}

.username {
  font-size: 0.75rem;
  line-height: 1rem;
  color: #7DD3FC;
  margin-left: 0.25rem;
}
```

To install the stable version:

  ```shell
  npm install css-modules-to-tailwind -g
  ```

Or use directly:

  ```shell
  npx css-modules-to-tailwind src/index.tsx
  // npx css-modules-to-tailwind src/**/*.tsx
  ```

Tool will check your git directory is clean, you can use '--force' to skip the check.

When you're done, in your index.tsx:

```tsx
import style form 'index.module.css';

const User = () => (
  <div className={`${style.header} items-center flex justify-between w-full`}>
    <div className={`${style.user} items-center flex font-bold`}>
      <img className={`${style.avatar} h-2.5 w-2.5`} src={creator.avatar} alt="avatar" />
      <span className={`${style.username} text-sky-300 text-xs ml-1`}>{creator.username}</span>
    </div>
    <div className={style.channelName}>{channel.name}</div>
  </div>
);
```

Your css file:

```css
// index.module.css
// no more content
```

> why not delete index.module.css? Because it's dangerous...There may be other places that still depend on it.

You might question if I have custom style in css file, like:

```css
.selector1 {
  width: 1111px;
  font-size: 0.75rem;
  line-height: 1rem;
}

.selector2 :global .global-class {
  font-size: 0.75rem;
  line-height: 1rem;
}

.selector2 {
  font-size: 0.75rem;
  line-height: 1rem;
}

.fuck {
  composes: selector2;
}
```

Of course, we won't delete it, it's going to look like this:

```css
.selector1 {
  width: 1111px;
}

.selector2 :global .global-class {
  @apply text-xs;
}

.selector2 {
  @apply text-xs;
}

.fuck {
  composes: selector2;
}
```

## Only css-modules?

Of course not.It can also be used for less/scss modules, but it doesn't work very well, like:

```less
.selector1 {
  selector2();
}

.selector2 {
  font-size: 0.75rem;
  line-height: 1rem;
}
```

It just becomes:

```less
.selector1 {
  selector2();
}
```

I think you should use `composes`.

## Inappropriate scenes

### Unreasonable nesting

```tsx
import style form 'index.module.css';

const User = () => (
  <>
    <div className={style.parentA}>
      <div className={style.childrenA}>childrenA</div>
    </div>
    <div className={style.parentB}>
      <div className={style.childrenA}>childrenA</div>
    </div>
  </>
);
```
```css
.parentA {
  .childrenA {
    // some decl
  }
}
```
You shouldn't use nesting as namespace.

### You should not write multiple/conflicting declarations in a selector

```tsx
import clsx from 'clsx';
import style form 'index.module.css';

const User = () => (
  <>
    <div className={clsx(style.cls1, style.cls2)}></div>
  </>
);
```
```css
.cls1 {
  margin-left: 0.5rem;
  display: none;
}

.cls2 {
  margin-left: 0.375rem;
  display: block
}
```
Always, it will become like this:
```tsx
import style form 'index.module.css';

const User = () => (
  <>
    <div className={clsx(`${style.cls1} hidden ml-2`, `${style.cls2} block ml-1.5`)}></div>
  </>
);
```

I mean, in tailwind, "`ml-2 ml-1.5`" === "`ml-2`", but in your code, is the latter declaration overriding the former.

## Do i have to use tailwind-css?

I don't think so, I use it just because I like it.

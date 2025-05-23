# CSS Modules to Tailwind CSS

This is a tool to convert css-modules to tailwind-css

<p>
  <img src="./logo.svg" alt="Tailwind Tool">
</p>
<p>
  <a href="https://www.npmjs.com/package/css-modules-to-tailwind"><img src="https://img.shields.io/npm/dm/css-modules-to-tailwind?style=flat-square" alt="Total Downloads"></a>
  <a href="https://www.npmjs.com/package/css-modules-to-tailwind"><img src="https://img.shields.io/bundlephobia/minzip/css-modules-to-tailwind?style=flat-square" alt="Latest Release"></a>
  <a href="https://github.com/shiyangzhaoa/css-modules-to-tailwind/blob/main/LICENSE"><img src="https://shields.io/github/license/shiyangzhaoa/css-modules-to-tailwind?style=flat-square" alt="License"></a>
</p>

## Support list

- [x] tsconfig.json alias support, like `alias/component/index.module.css`
- [x] css file circular reference
- [x] project level support, just run this command: `npx css-modules-to-tailwind src/**/*.tsx`
- [x] arbitrary values support, `margin: 15px` => `m-[15px]`
- [ ] pseudo-classes support
- [x] tailwind prefixes support, e.g. `tw:`

## About

- [CSS Modules](https://github.com/css-modules/css-modules)
- [Tailwind CSS](https://tailwindcss.com/)

## Install

Global install:

  ```shell
  npm install css-modules-to-tailwind -g
  ```

Or use `npx`:

  ```shell
  npx css-modules-to-tailwind src/index.tsx
  // npx css-modules-to-tailwind src/**/*.tsx
  ```

It will check your git directory is clean, you can use '--force' to skip the check.

## How it works

It uses [jscodeshift](https://github.com/facebook/jscodeshift) and [postcss](https://github.com/postcss/postcss).

Try it yourself:

1. First, Create a new jsx/tsx file(index.tsx/jsx):

   ```tsx
   import React from 'react';
   import style from './index.module.css';

   export const User = () => (
     <div className={style.header}>
       <div className={style.user}>
         <img className={style.avatar} alt="avatar" />
         <span className={style.username}>username</span>
       </div>
       <div className={style.channelName}>name</div>
     </div>
   );
   ```

2. Create a new css modules file:

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

3. Use this tool now:

   ```shell
   npx css-modules-to-tailwind index.tsx
   ```

4. You will get:

   ```ts
   // index.tsx
   import React from 'react';

   export const User = () => (
     <div className='items-center flex justify-between w-full'>
       <div className='items-center flex font-bold'>
         <img className='h-2.5 w-2.5' alt="avatar" />
         <span className='text-sky-300 text-xs ml-1'>username</span>
       </div>
       <div className={` `}>name</div>
     </div>
   );
   ```

   > If the css file content is empty, import specifiers and css files will be removed, unused class will be replaced with \` \`, You should search globally for \` \`, then delete them.

🙋‍♂️ Flat and single structure design makes this tool work better.

## Only css-modules?

Of course not. It can also be used for less/scss modules, but it doesn't work very well, like:

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
const User = () => (
  <>
    <div className={clsx('hidden ml-2', 'block ml-1.5')}></div>
  </>
);
```

I mean, in tailwind, "`ml-2 ml-1.5`" === "`ml-2`", but in your code, is the latter declaration overriding the former.

## Support detail

### Composes

1. Quote itself

   ```css
   .class1 {
     display: flex;
   }

   .class2 {
     compose: class1
   }
   ```

   it just becomes:

   ```css
   .class1 {
     @apply flex;
   }

   .class2 {
     composes: class1
   }
   ```

2. Other CSS file:

   ```css
   /** index1.module.css */
   .test1 {
     display: flex;
   }

   /** index2.module.css */
   .test2 {
     composes: test1 from './index1.module.css'
   }
   ```

   `index1.module.css` will be removed, and `index2.module.css`:

   ```css
   .test2 {
     @apply flex;
   }
   ```

### Multiple states

For example:

```css
.button {
  width: 1.25rem; /* 20px */
}

.box .button {
  width: 2rem; /* 32px */
}
```

It just becomes:

```css
.button {
  @apply w-5; /* 20px */
}

.box .button {
  @apply w-8; /* 32px */
}
```

Classes with multiple states will not do too much processing, because I don't know if there is a conflict between the states.

### Permutations

Multiple style declarations can form a Tailwind CSS class. For example:

```css
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

```tsx
const Com = () => <div className={style.truncate}>text</div>
```

It will become:

```tsx
const Com = () => <div className='truncate'>text</div>
```

Of course, it supports more complex permutations and combinations, you can try it.

### Tailwind Prefixes

For example:

```css
.tw-bg-red-500 {
  background-color: #f56565;
}
```

```tsx
const Com = () => <div className='tw-bg-red-500'>text</div>
```

```
npx css-modules-to-tailwind src/**/*.tsx --prefix=tw:
```

## Do i have to use tailwind-css?

I think it's very useful, you can try it

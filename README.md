# auto-path-with-comment README

## Features

通过注释为 js/ts 函数添加路径补全功能

Add path completion to js/ts function through comments

特别是 vite 资源引入时，使用函数包装后，无法享受路径提示，而写`import xxx from "../assets/....png"`又太冗长。这个简单的插件就是为了解决这个问题。

```ts
// @auto-path:../assets
function getAssets(url: string) {
    return new URL(`../assets/${name}`, import.meta.url).href;
}

getAssets(""); // Ctrl+Space 提示路径 Prompt path
```

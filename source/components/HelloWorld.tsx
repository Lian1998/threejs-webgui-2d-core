import { defineComponent } from "vue";

import { ref } from "vue";

/**  */
const HelloWorld = defineComponent<HelloWorldAttrs & HelloWorldProps>({
  name: "HelloWorld",
  setup: (props, ctx) => {
    const cProps = props as HelloWorldProps;
    const cAttrs = ctx.attrs as HelloWorldAttrs;
    const cExpose = ctx.expose as HelloWorldExpose;

    const count = ref<number>(0);
    const onClick = () => {
      count.value += 1;
    };

    cExpose({
      getCounterValue: () => {
        return count.value;
      },
    });

    return () => (
      <>
        <h1>
          {cProps.msg} {cAttrs.info}
        </h1>
        <div class="card">
          <button type="button" onClick={onClick}>
            count is {count.value}
          </button>
          <p>
            Edit <code>components/HelloWorld.tsx</code> to test HMR
          </p>
        </div>

        <p>
          Check out{" "}
          <a href="https://vuejs.org/guide/quick-start.html#local" target="_blank">
            create-vue
          </a>
          , the official Vue + Vite starter
        </p>
        <p>
          Install{" "}
          <a href="https://github.com/vuejs/language-tools" target="_blank">
            Volar
          </a>{" "}
          in your IDE for a better DX
        </p>
        <p class="read-the-docs">Click on the Vite and Vue logos to learn more</p>
      </>
    );
  },
});

HelloWorld.props = ["msg"];

export type HelloWorldAttrs = {
  info: string;
};
export type HelloWorldProps = {
  msg: string;
};
export type HelloWorldExposed = {
  getCounterValue: () => number;
};
export type HelloWorldExpose = (exposed: HelloWorldExposed) => void;

export { HelloWorld };

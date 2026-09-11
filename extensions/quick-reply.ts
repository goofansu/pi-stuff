import {
  DynamicBorder,
  type ExtensionAPI,
  keyHint,
} from "@earendil-works/pi-coding-agent";
import {
  Container,
  type SelectItem,
  SelectList,
  Text,
} from "@earendil-works/pi-tui";

const REPLIES = ["continue", "approved", "your recommends"] as const;

export default function (pi: ExtensionAPI) {
  pi.registerShortcut("alt+shift+enter", {
    description: "Pick and send a quick reply",
    handler: async (ctx) => {
      if (!ctx.isIdle()) {
        ctx.ui.notify(
          "Quick replies are only available when the agent is idle",
          "warning",
        );
        return;
      }

      const items: SelectItem[] = REPLIES.map((reply, index) => ({
        value: reply,
        label: `${index + 1}. ${reply}`,
      }));
      const reply = await ctx.ui.custom<string | null>(
        (tui, theme, _keybindings, done) => {
          const container = new Container();
          container.addChild(
            new DynamicBorder((text: string) => theme.fg("accent", text)),
          );
          container.addChild(
            new Text(theme.fg("accent", theme.bold("Quick reply")), 1, 0),
          );

          const selectList = new SelectList(items, items.length, {
            selectedPrefix: (text) => theme.fg("accent", text),
            selectedText: (text) => theme.fg("accent", text),
            description: (text) => theme.fg("muted", text),
            scrollInfo: (text) => theme.fg("dim", text),
            noMatch: (text) => theme.fg("warning", text),
          });
          selectList.onSelect = (item) => done(item.value);
          selectList.onCancel = () => done(null);
          container.addChild(selectList);

          container.addChild(
            new Text(
              theme.fg("dim", "1–3 quick send • ") +
                keyHint("tui.select.confirm", "send") +
                theme.fg("dim", " • ") +
                keyHint("tui.select.cancel", "cancel"),
              1,
              0,
            ),
          );
          container.addChild(
            new DynamicBorder((text: string) => theme.fg("accent", text)),
          );

          return {
            render: (width: number) => container.render(width),
            invalidate: () => container.invalidate(),
            handleInput: (data: string) => {
              const quickReply = REPLIES[Number(data) - 1];
              if (quickReply !== undefined) {
                done(quickReply);
                return;
              }

              selectList.handleInput(data);
              tui.requestRender();
            },
          };
        },
      );
      if (reply === null || reply === undefined) return;

      if (!ctx.isIdle()) {
        ctx.ui.notify("The agent is no longer idle", "warning");
        return;
      }

      pi.sendUserMessage(reply);
    },
  });
}

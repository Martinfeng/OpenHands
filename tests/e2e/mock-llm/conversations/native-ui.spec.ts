import {
  test,
  expect,
  type Page,
  type APIRequestContext,
} from "@playwright/test";
import {
  seedLocalStorage,
  ensureMockLLMProfile,
  registerTrajectory,
  activateTrajectory,
  setChatInput,
  getConversationIdFromURL,
  deleteConversation,
  BACKEND_URL,
  SESSION_API_KEY,
  dismissAnalyticsModal,
  selectDropdownOption,
} from "../utils/mock-llm-helpers";

const headers = { "X-Session-API-Key": SESSION_API_KEY };
const markdown =
  "Analysis complete.\n\n## Training metrics\n\nLoss $L = x^2$\n\n| Epoch | Loss | Accuracy |\n| --- | --- | --- |\n| 1 | 0.42 | 0.73 |\n| 2 | | 0.81 |\n| 3 | 0.19 | 0.89 |\n\n```python\nprint('metrics')\n```";

async function setConfirmation(request: APIRequestContext, enabled: boolean) {
  const response = await request.patch(`${BACKEND_URL}/api/settings`, {
    headers,
    data: {
      conversation_settings_diff: {
        confirmation_mode: enabled,
        security_analyzer: "none",
      },
    },
  });
  expect(response.ok(), `settings update: ${response.status()}`).toBe(true);
}

async function start(page: Page) {
  await page.goto("/");
  await dismissAnalyticsModal(page);
  await setChatInput(page, "Run the requested check, then report the result.");
  await page.getByTestId("submit-button").click();
  await expect(page).toHaveURL(/\/conversations\/[^/]+$/, {
    timeout: 30_000,
  });
  return getConversationIdFromURL(page);
}

test.describe("native UI with Agent Server 1.42.1", () => {
  test.setTimeout(150_000);
  test.beforeEach(async ({ page, request }) => {
    await seedLocalStorage(page);
    const info = await request.get(`${BACKEND_URL}/server_info`, { headers });
    expect((await info.json()).sdk_version).toBe("1.42.1");
    await ensureMockLLMProfile(page);
  });

  test("approves a real tool and renders math, charts and theme changes", async ({
    page,
    request,
  }, testInfo) => {
    await setConfirmation(request, true);
    await registerTrajectory(request, "native-data", [
      {
        tool_call: {
          name: "terminal",
          arguments: { command: "sleep 3; printf 'NATIVE_UI_TOOL_OK\\n'" },
        },
      },
      { text: markdown },
    ]);
    await activateTrajectory(request, "native-data");
    const id = await start(page);
    try {
      const approve = page.getByTestId("action-confirm-button");
      await expect(approve).toBeVisible({ timeout: 30_000 });
      await expect(page.locator(".oh-text-shimmer")).toHaveCount(0);
      const confirmationUrl = `${BACKEND_URL}/api/conversations/${id}/events/respond_to_confirmation`;
      await page.route(confirmationUrl, (route) =>
        route.fulfill({
          status: 503,
          json: { detail: "Temporary test failure" },
        }),
      );
      await approve.click();
      await expect(
        page
          .getByRole("alert")
          .filter({ hasText: "Could not send your decision" }),
      ).toBeVisible();
      await expect(approve).toBeEnabled();
      await expect(page.locator(".oh-text-shimmer")).toHaveCount(0);
      await page.unroute(confirmationUrl);
      const decision = page.waitForRequest(
        (req) =>
          req.method() === "POST" &&
          req.url().endsWith("/events/respond_to_confirmation"),
      );
      await approve.click();
      expect((await decision).postDataJSON()).toEqual({ accept: true });
      await expect(page.locator(".oh-text-shimmer")).toHaveCount(1);
      expect(
        await page
          .locator(".oh-text-shimmer")
          .evaluate((el) => getComputedStyle(el).animationDuration),
      ).toBe("2.6s");
      await expect(
        page
          .getByTestId("agent-message")
          .filter({ hasText: "Analysis complete." }),
      ).toBeVisible({ timeout: 30_000 });
      await expect(page.locator(".oh-text-shimmer")).toHaveCount(0);
      const data = page.getByTestId("data-table");
      await expect(data.getByRole("table")).toBeVisible();
      await expect(page.locator(".katex")).toHaveCount(1);
      await data.getByRole("button", { name: "Line", exact: true }).click();
      await expect(data.locator("canvas")).toBeVisible();
      await data.getByRole("button", { name: "Bar", exact: true }).click();
      await expect(data.locator("canvas")).toBeVisible();
      await data.getByRole("button", { name: "Scatter", exact: true }).click();
      await expect(data.locator("canvas")).toBeVisible();
      await data.getByRole("button", { name: "Expand", exact: true }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).not.toBeVisible();
      await expect(
        data.getByRole("button", { name: "Expand", exact: true }),
      ).toBeFocused();

      const conversationPath = `/conversations/${id}`;
      await page.goto("/settings/app");
      await selectDropdownOption(page, /Color theme/i, "Follow system");
      await page.goto(conversationPath);
      for (const colorScheme of ["light", "dark"] as const) {
        await page.emulateMedia({ colorScheme });
        await expect(page.locator("body")).toHaveAttribute(
          "data-theme",
          colorScheme,
        );
        await expect(data.getByRole("table")).toContainText("0.89");
        await data.getByRole("button", { name: "Line", exact: true }).click();
        await expect(data.locator("canvas")).toBeVisible();
        await page.screenshot({
          path: testInfo.outputPath(`native-${colorScheme}.png`),
        });
        await data.getByRole("button", { name: "Table", exact: true }).click();
      }
      await page.setViewportSize({ width: 360, height: 800 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await expect(data.getByRole("table")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({ path: testInfo.outputPath("native-narrow.png") });
    } finally {
      await deleteConversation(request, id);
      await setConfirmation(request, false);
    }
  });

  test("rejects a real tool without executing it", async ({
    page,
    request,
  }) => {
    await setConfirmation(request, true);
    await registerTrajectory(request, "native-reject", [
      {
        tool_call: {
          name: "terminal",
          arguments: { command: "printf 'SHOULD_NOT_EXECUTE\\n'" },
        },
      },
      { text: "Decision received." },
    ]);
    await activateTrajectory(request, "native-reject");
    const id = await start(page);
    try {
      await expect(page.getByTestId("action-reject-button")).toBeVisible({
        timeout: 30_000,
      });
      await page.getByTestId("action-reject-button").click();
      await expect(page.locator(".oh-text-shimmer")).toHaveCount(0);
      let events: { kind?: string; observation?: { kind?: string } }[] = [];
      await expect
        .poll(async () => {
          const result = await request.get(
            `${BACKEND_URL}/api/conversations/${id}/events/search`,
            { headers },
          );
          expect(result.ok()).toBe(true);
          events = (await result.json()).items;
          return events.some((event) => event.kind === "UserRejectObservation");
        })
        .toBe(true);
      expect(
        events.some(
          (event: { observation?: { kind?: string } }) =>
            event.observation?.kind === "TerminalObservation",
        ),
      ).toBe(false);
      await setChatInput(page, "Continue after my rejection.");
      await page.getByTestId("submit-button").click();
      await expect(
        page
          .getByTestId("agent-message")
          .filter({ hasText: "Decision received." }),
      ).toBeVisible({ timeout: 30_000 });
    } finally {
      await deleteConversation(request, id);
      await setConfirmation(request, false);
    }
  });

  test("clears response motion on disconnect and supports stop and continue", async ({
    page,
    request,
  }) => {
    await setConfirmation(request, false);
    await page.addInitScript(() => {
      const sockets: WebSocket[] = [];
      const NativeWebSocket = window.WebSocket;
      window.WebSocket = class extends NativeWebSocket {
        constructor(...args: ConstructorParameters<typeof WebSocket>) {
          super(...args);
          sockets.push(this);
        }
      };
      Object.assign(window, { nativeUiTestSockets: sockets });
    });
    await registerTrajectory(request, "native-stop", [
      { text: "This response must be interrupted.", delay_seconds: 45 },
      { text: "Continued successfully." },
    ]);
    await activateTrajectory(request, "native-stop");
    const id = await start(page);
    try {
      await expect(page.locator(".oh-text-shimmer")).toHaveCount(1, {
        timeout: 30_000,
      });
      await page.emulateMedia({ reducedMotion: "reduce" });
      const statusTitle = page
        .getByTestId("live-activity-chip")
        .locator("span");
      await expect(statusTitle).toBeVisible();
      expect(
        await statusTitle.evaluate((el) => getComputedStyle(el).animationName),
      ).toBe("none");
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await expect
        .poll(() =>
          page.evaluate(() => {
            const { nativeUiTestSockets } = window as unknown as {
              nativeUiTestSockets: WebSocket[];
            };
            return nativeUiTestSockets.filter(
              (socket) =>
                socket.readyState === WebSocket.OPEN &&
                new URL(socket.url).pathname.includes("/sockets/events/"),
            ).length;
          }),
        )
        .toBeGreaterThan(0);
      await page.evaluate(() => {
        const { nativeUiTestSockets } = window as unknown as {
          nativeUiTestSockets: WebSocket[];
        };
        const active = nativeUiTestSockets.filter(
          (socket) => socket.readyState === WebSocket.OPEN,
        );
        active.forEach((socket) => socket.close(4001, "UI reconnect test"));
      });
      await page.context().setOffline(true);
      await expect(page.locator(".oh-text-shimmer")).toHaveCount(0);
      await page.context().setOffline(false);
      await expect(page.locator(".oh-text-shimmer")).toHaveCount(1, {
        timeout: 15_000,
      });
      await page.getByTestId("stop-button").click();
      await expect(page.locator(".oh-text-shimmer")).toHaveCount(0);
      // Stay on the page while the real pause request finishes. Navigating
      // immediately after the click can abort it before it reaches the server.
      await expect(page.getByTestId("play-button")).toBeVisible({
        timeout: 30_000,
      });
      await page.getByTestId("play-button").click();
      await expect(
        page
          .getByTestId("agent-message")
          .filter({ hasText: "Continued successfully." }),
      ).toBeVisible({ timeout: 40_000 });
      await expect(
        page.getByTestId("agent-message").filter({
          hasText: "This response must be interrupted.",
        }),
      ).toHaveCount(0);
      await expect(page.locator(".oh-text-shimmer")).toHaveCount(0);
    } finally {
      await page.context().setOffline(false);
      await deleteConversation(request, id);
      await setConfirmation(request, false);
    }
  });
});

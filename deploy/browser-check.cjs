/* Run with: node deploy/browser-check.cjs [http://127.0.0.1:3301]
 * Waitlist requests are always mocked. This check never inserts signup rows.
 */
const { chromium, expect } = require("@playwright/test");
const assert = require("node:assert/strict");

const baseURL = process.argv[2] || "http://127.0.0.1:3301";
const viewports = [
  { width: 1440, height: 1000 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
  { width: 360, height: 800 },
];

async function noOverflow(page, stage) {
  const sizes = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  assert(
    sizes.document <= sizes.viewport + 1,
    `${stage}: document overflow ${JSON.stringify(sizes)}`,
  );
  assert(
    sizes.body <= sizes.viewport + 1,
    `${stage}: body overflow ${JSON.stringify(sizes)}`,
  );
}

async function checkBudget(page, minutes) {
  await expect(page.locator(".ep-budget-summary > strong")).toContainText(
    `${minutes} min`,
  );
  const values = (
    await page.locator(".ep-budget-labels b").allTextContents()
  ).map((value) => Number.parseInt(value, 10));
  assert.equal(
    values.length,
    3,
    "The plan needs outward, outside, and return time",
  );
  assert.equal(
    values.reduce((total, value) => total + value, 0),
    minutes,
    "The time budget must sum to the available time",
  );
  assert(
    values.every((value) => value > 0),
    "Every part of the plan needs a positive time budget",
  );
  await expect(page.locator(".ep-budget")).toHaveAttribute(
    "aria-label",
    new RegExp(`${minutes} minutes total`),
  );
}

async function build(page, minutes) {
  const slider = page.getByRole("slider", {
    name: "Time available in minutes",
  });
  await slider.focus();
  await slider.press("Home");
  if (minutes >= 90) await slider.press("ArrowRight");
  if (minutes === 180) await slider.press("ArrowRight");
  await expect(slider).toHaveAttribute("aria-valuetext", `${minutes} minutes`);
  await page
    .getByRole("button", { name: "Build example plan", exact: true })
    .click();
  await expect(page.locator(".ep-result")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await checkBudget(page, minutes);
}

async function runViewport(browser, viewport) {
  const context = await browser.newContext({
    viewport,
    reducedMotion: "reduce",
    acceptDownloads: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const errors = [];
  let signupRequests = 0;
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      !message.text().includes("503 (Service Unavailable)")
    )
      errors.push(message.text());
  });
  await context.route("**/api/waitlist", async (route) => {
    signupRequests += 1;
    assert.equal(route.request().method(), "POST");
    assert.equal(
      route.request().postDataJSON().email,
      "browser-preview@example.invalid",
    );
    await route.fulfill({
      status: signupRequests === 1 ? 503 : 200,
      contentType: "application/json",
      body: JSON.stringify(
        signupRequests === 1
          ? { error: "The preview service is unavailable. Please try again." }
          : { success: true },
      ),
    });
  });

  try {
    await page.goto(baseURL, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await noOverflow(page, "Initial page");

    const menuToggle = page.getByRole("button", {
      name: "Open menu",
      exact: true,
    });
    if (await menuToggle.isVisible()) {
      await expect(page.locator("#main-nav")).toBeHidden();
      await menuToggle.click();
      await expect(
        page.getByRole("button", { name: "Close menu", exact: true }),
      ).toHaveAttribute("aria-expanded", "true");
      await expect(page.locator("#main-nav")).toBeVisible();
      await noOverflow(page, "Expanded mobile navigation");
      await page
        .locator("#main-nav")
        .getByRole("link", { name: "Try the preview", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "Open menu", exact: true }),
      ).toHaveAttribute("aria-expanded", "false");
      await expect(page.locator("#main-nav")).toBeHidden();
      assert.equal(new URL(page.url()).hash, "#planner");
    } else {
      await expect(page.locator("#main-nav")).toBeVisible();
    }

    await page
      .locator(".time-options")
      .getByRole("button", { name: /An hour/ })
      .click();
    await expect(page.getByRole("slider")).toHaveAttribute(
      "aria-valuetext",
      "60 minutes",
    );
    await checkBudget(page, 60);

    await page
      .locator(".escape-card")
      .filter({ hasText: "Follow the water." })
      .click();
    await expect(page.locator(".ep-plan-title-row h3")).toHaveText(
      "The shoreline reset",
    );
    await expect(
      page.getByRole("button", { name: "Open water", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".ep-result-image")).toHaveAttribute(
      "src",
      /\/media\/coast\.(png|webp)$/,
    );
    await checkBudget(page, 180);

    await page
      .getByRole("button", { name: "Higher ground", exact: true })
      .click();
    await page.getByRole("button", { name: "By bike", exact: true }).click();
    for (const minutes of [60, 90, 180]) await build(page, minutes);
    await expect(page.locator(".ep-plan-title-row h3")).toHaveText(
      "The change of perspective",
    );
    await expect(page.locator(".ep-result-image")).toHaveAttribute(
      "src",
      /\/media\/hills\.(png|webp)$/,
    );
    await expect(page.locator(".ep-photo-disclaimer")).toContainText(
      "not navigation",
    );
    await noOverflow(page, "Built planner");

    await page
      .getByRole("button", {
        name: "Save this preview in your browser",
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("button", { name: "Remove saved preview", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    const saved = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("elsewhere-saved-previews") || "[]"),
    );
    assert(
      saved.includes("180-hills-bike"),
      "The selected plan should be stored in this browser",
    );
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page
        .getByRole("button", { name: "Take this with you", exact: true })
        .click(),
    ]);
    assert.equal(
      download.suggestedFilename(),
      "elsewhere-hills-180min-preview.txt",
    );
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const downloaded = Buffer.concat(chunks).toString("utf8");
    for (const text of [
      "The change of perspective",
      "NOT A REAL ROUTE OR NAVIGATION",
      "Getting there: By bike",
      "Total: 180 minutes",
    ])
      assert(downloaded.includes(text), `Missing from download: ${text}`);

    await page.reload({ waitUntil: "domcontentloaded" });
    await page
      .getByRole("button", { name: "Higher ground", exact: true })
      .click();
    await page.getByRole("button", { name: "By bike", exact: true }).click();
    await build(page, 180);
    await expect(
      page.getByRole("button", { name: "Remove saved preview", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");

    const faq = page.getByRole("button", {
      name: "Can I follow these routes today?",
      exact: true,
    });
    await faq.click();
    await expect(faq).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#answer-1")).toBeVisible();
    await expect(page.locator("#answer-0")).toBeHidden();
    await faq.click();
    await expect(page.locator("#answer-1")).toBeHidden();

    const privacyTrigger = page.getByRole("button", {
      name: "A note on your email",
      exact: true,
    });
    await privacyTrigger.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const close = dialog.getByRole("button", {
      name: "Close privacy note",
      exact: true,
    });
    const contact = dialog.getByRole("link", {
      name: "Contact the site owner",
      exact: true,
    });
    await expect(close).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(contact).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(close).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(contact).toBeFocused();
    await noOverflow(page, "Privacy dialog open");
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(privacyTrigger).toBeFocused();
    assert.notEqual(
      await page.evaluate(() => document.body.style.overflow),
      "hidden",
      "Closing the dialog must restore scrolling",
    );

    await page
      .getByRole("textbox", { name: "Your email address", exact: true })
      .fill("browser-preview@example.invalid");
    await page
      .getByRole("button", { name: "Count me in", exact: true })
      .click();
    await expect(page.locator('.form-error[role="alert"]')).toHaveText(
      "The preview service is unavailable. Please try again.",
    );
    await page
      .getByRole("button", { name: "Count me in", exact: true })
      .click();
    await expect(page.locator(".signup-success")).toContainText(
      "You’re on the list.",
    );
    await expect(page.locator(".signup-form")).toHaveCount(0);
    assert.equal(
      signupRequests,
      2,
      "Both signup requests must use the mock handler",
    );
    await noOverflow(page, "Signup success");
    assert.deepEqual(
      errors,
      [],
      "No browser exceptions or unexpected console errors",
    );
    console.log(
      `PASS ${viewport.width}×${viewport.height}: layout, navigation, planner, save/download, FAQ, modal, mocked signup`,
    );
  } catch (error) {
    await page
      .screenshot({
        path: `/tmp/elsewhere-browser-failure-${viewport.width}.png`,
        fullPage: true,
      })
      .catch(() => {});
    throw new Error(`${viewport.width}×${viewport.height}: ${error.message}`, {
      cause: error,
    });
  } finally {
    await context.close();
  }
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox"],
  });
  const failures = [];
  try {
    for (const viewport of viewports) {
      try {
        await runViewport(browser, viewport);
      } catch (error) {
        failures.push(error);
        console.error(`FAIL ${error.message}`);
      }
    }
  } finally {
    await browser.close();
  }
  if (failures.length) process.exitCode = 1;
  else
    console.log(
      "All four viewport checks passed. No waitlist requests reached the server.",
    );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

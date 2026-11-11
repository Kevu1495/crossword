import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { Puzzle } from "../frontend/src/puzzle";
const puzzles = JSON.parse(
  readFileSync(
    new URL("../frontend/src/puzzles.json", import.meta.url),
    "utf8",
  ),
) as Puzzle[];
test("play, check, hint, save, switch modes and finish", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "A little crossword. A lovely pause." }),
  ).toBeVisible();
  const puzzle = puzzles[0];
  const e = puzzle.entries[0];
  const input = page.locator("input").first();
  await input.fill("Z");
  await page.getByRole("button", { name: "Check word", exact: false }).click();
  await expect(page.getByRole("status")).toContainText("another look");
  await input.click();
  await page
    .getByRole("button", { name: "Reveal letter", exact: false })
    .click();
  await expect(input).toHaveValue(puzzle.solution[e.row][e.col]);
  await page.reload();
  await expect(page.locator("input").first()).toHaveValue(
    puzzle.solution[e.row][e.col],
  );
  await page.getByRole("button", { name: "11 × 11", exact: false }).click();
  await expect(
    page.getByRole("group", { name: "11 by 11 crossword" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "15 × 15", exact: false }).click();
  await expect(
    page.getByRole("group", { name: "15 by 15 crossword" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Hard", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Hard", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "7 × 7", exact: false }).click();
  const current = puzzles.find((p) => p.size === 7 && p.difficulty === "hard")!;
  await page.evaluate((p) => {
    const letters: Record<string, string> = {};
    p.solution.forEach((row, r) =>
      Array.from(row).forEach((c, col) => {
        if (c !== "#") letters[`${r},${col}`] = c;
      }),
    );
    localStorage.setItem(
      `crossword:v1:${p.id}`,
      JSON.stringify({ letters, revealed: [] }),
    );
    localStorage.setItem("crossword:last", JSON.stringify(p.id));
  }, current);
  await page.reload();
  await expect(page.getByRole("status")).toContainText(
    "Every little word found its place",
  );
  await page.getByRole("button", { name: "Start over", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Start fresh", exact: true }).click();
  await expect(page.locator("input").first()).toHaveValue("");
  expect(errors).toEqual([]);
});
test("keyboard controls, mobile layout and help", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "How to play", exact: false }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "There are no penalties",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  const inputs = page.locator("input");
  await inputs.first().focus();
  await page.keyboard.type("AB");
  await expect(inputs.nth(0)).toHaveValue("A");
  await expect(inputs.nth(1)).toHaveValue("B");
  await page.keyboard.press("Backspace");
  await expect(inputs.nth(1)).toHaveValue("");
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowDown");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "/tmp/crossword-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.screenshot({ path: "/tmp/crossword-desktop.png", fullPage: true });
});
test("clicking a new cell keeps direction and clicking it again switches", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .locator(".clue-section")
    .first()
    .locator("li button")
    .first()
    .click();
  await page.locator("input").nth(1).click();
  await expect(page.locator(".clue-tag")).toContainText("across");
  await page.locator("input").nth(1).click();
  await expect(page.locator(".clue-tag")).toContainText("down");
});

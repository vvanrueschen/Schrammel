import { test, expect } from "@playwright/test";

test("homepage loads with correct title", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Schrammel Reloaded/);
});

test("homepage shows stream title", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByText(/Der Schrammel.*Reloaded.*Stream/).first()
  ).toBeVisible();
});

test("homepage shows Top 10 section", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Top 10")).toBeVisible();
});

test("homepage shows Wishlist section", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Wunschliste")).toBeVisible();
});

test("wishlist form validates empty fields", async ({ page }) => {
  await page.goto("/");

  page.on("dialog", (dialog) => {
    expect(dialog.message()).toBe("Nicht alle Felder sind ausgefüllt");
    dialog.dismiss();
  });

  await page.getByRole("button", { name: "Einreichen" }).click();
});

test("api ranking returns array", async ({ request }) => {
  const response = await request.get("/api/ranking");
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(Array.isArray(body)).toBeTruthy();
});

test("api songs returns array", async ({ request }) => {
  const response = await request.get("/api/songs");
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(Array.isArray(body)).toBeTruthy();
});

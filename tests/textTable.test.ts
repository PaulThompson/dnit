import { assertEquals, assertFalse, assertGreater, assertStringIncludes } from "@std/assert";
import { textTable, plainTextTable } from "../utils/textTable.ts";

Deno.test("textTable utilities", async (t) => {
  await t.step("basic table with single row", () => {
    const headings = ["Name", "Age"];
    const cells = [["John", "30"]];
    const result = textTable(headings, cells);

    // Should contain proper box drawing characters
    assertEquals(typeof result, "string");
    assertStringIncludes(result, "┌");
    assertStringIncludes(result, "┐");
    assertStringIncludes(result, "└");
    assertStringIncludes(result, "┘");
    assertStringIncludes(result, "│");
    assertStringIncludes(result, "─");

    // Should contain the data
    assertStringIncludes(result, "Name");
    assertStringIncludes(result, "Age");
    assertStringIncludes(result, "John");
    assertStringIncludes(result, "30");
  });

  await t.step("empty table with headers only", () => {
    const headings = ["Column1", "Column2"];
    const cells: string[][] = [];
    const result = textTable(headings, cells);

    assertEquals(typeof result, "string");
    assertStringIncludes(result, "Column1");
    assertStringIncludes(result, "Column2");
    // Should still have proper table structure
    assertStringIncludes(result, "┌");
    assertStringIncludes(result, "┐");
  });

  await t.step("multiple rows with varying lengths", () => {
    const headings = ["Short", "Very Long Header"];
    const cells = [
      ["A", "Short"],
      ["Very Long Content", "B"],
    ];
    const result = textTable(headings, cells);

    assertEquals(typeof result, "string");
    assertStringIncludes(result, "Short");
    assertStringIncludes(result, "Very Long Header");
    assertStringIncludes(result, "Very Long Content");

    // Should handle alignment properly
    const lines = result.split("\n");
    assertGreater(lines.length, 3); // At least headers, separator, and rows
  });

  await t.step("single column table", () => {
    const headings = ["Status"];
    const cells = [["Active"], ["Inactive"], ["Pending"]];
    const result = textTable(headings, cells);

    assertEquals(typeof result, "string");
    assertStringIncludes(result, "Status");
    assertStringIncludes(result, "Active");
    assertStringIncludes(result, "Inactive");
    assertStringIncludes(result, "Pending");
  });

  await t.step("table with special characters", () => {
    const headings = ["Symbols", "Unicode"];
    const cells = [
      ["!@#$%", "αβγδε"],
      ["^&*()", "中文测试"],
    ];
    const result = textTable(headings, cells);

    assertEquals(typeof result, "string");
    assertStringIncludes(result, "!@#$%");
    assertStringIncludes(result, "αβγδε");
    assertStringIncludes(result, "^&*()");
    assertStringIncludes(result, "中文测试");
  });

  await t.step("table with empty cells", () => {
    const headings = ["Name", "Value"];
    const cells = [
      ["Item1", ""],
      ["", "Value2"],
      ["Item3", "Value3"],
    ];
    const result = textTable(headings, cells);

    assertEquals(typeof result, "string");
    assertStringIncludes(result, "Item1");
    assertStringIncludes(result, "Value2");
    assertStringIncludes(result, "Item3");
    assertStringIncludes(result, "Value3");
  });

  await t.step("large table structure", () => {
    const headings = ["A", "B", "C", "D", "E"];
    const cells = [
      ["1", "2", "3", "4", "5"],
      ["6", "7", "8", "9", "10"],
      ["11", "12", "13", "14", "15"],
    ];
    const result = textTable(headings, cells);

    assertEquals(typeof result, "string");

    // Check all numbers are present
    for (let i = 1; i <= 15; i++) {
      assertStringIncludes(result, i.toString());
    }

    // Check all headers are present
    ["A", "B", "C", "D", "E"].forEach((header) => {
      assertStringIncludes(result, header);
    });
  });

  await t.step("column alignment and spacing", () => {
    const headings = ["ID", "Description"];
    const cells = [
      ["1", "Short"],
      ["123", "This is a much longer description"],
    ];
    const result = textTable(headings, cells);
    const lines = result.split("\n");

    // All lines should have same length (proper alignment)
    const firstLineLength = lines[0].length;
    lines.forEach((line) => {
      assertEquals(line.length, firstLineLength);
    });

    // Should contain proper spacing around content
    assertStringIncludes(result, " ID ");
    assertStringIncludes(result, " Description ");
  });

  await t.step("table with numbers and mixed content", () => {
    const headings = ["Index", "Name", "Score", "Active"];
    const cells = [
      ["0", "Alice", "95.5", "true"],
      ["1", "Bob", "87.2", "false"],
      ["2", "Charlie", "92.8", "true"],
    ];
    const result = textTable(headings, cells);

    assertEquals(typeof result, "string");
    assertStringIncludes(result, "Alice");
    assertStringIncludes(result, "95.5");
    assertStringIncludes(result, "false");

    // Check that the table has proper structure
    const lines = result.split("\n");
    assertEquals(lines.length, 7); // Top, header, separator, 3 data rows, bottom = 7 lines
  });

  await t.step("consistent table formatting", () => {
    // Test that identical tables produce identical output
    const headings = ["X", "Y"];
    const cells = [["a", "b"]];

    const result1 = textTable(headings, cells);
    const result2 = textTable(headings, cells);

    assertEquals(result1, result2);
  });

  await t.step("table line structure", () => {
    const headings = ["Test"];
    const cells = [["Data"]];
    const result = textTable(headings, cells);
    const lines = result.split("\n");

    // Should have: top border, header row, separator, data row, bottom border
    assertEquals(lines.length, 5);

    // First and last lines should be borders
    assertStringIncludes(lines[0], "┌");
    assertStringIncludes(lines[0], "┐");
    assertStringIncludes(lines[lines.length - 1], "└");
    assertStringIncludes(lines[lines.length - 1], "┘");

    // Middle separator should contain cross characters
    assertStringIncludes(lines[2], "├");
    assertStringIncludes(lines[2], "┤");
  });
});

Deno.test("plainTextTable utilities", async (t) => {
  await t.step("basic plain text table with single row", () => {
    const headings = ["Name", "Age"];
    const cells = [["John", "30"]];
    const result = plainTextTable(headings, cells);

    assertEquals(typeof result, "string");
    assertStringIncludes(result, "Name");
    assertStringIncludes(result, "Age");
    assertStringIncludes(result, "John");
    assertStringIncludes(result, "30");
    
    // Should not contain box drawing characters
    assertFalse(result.includes("┌"));
    assertFalse(result.includes("│"));
    assertFalse(result.includes("─"));
  });

  await t.step("plain text table with multiple rows", () => {
    const headings = ["Task", "Description"];
    const cells = [
      ["test", "Run local unit tests"],
      ["lint", "Run local lint"],
      ["fmt", "Run local fmt"],
    ];
    const result = plainTextTable(headings, cells);

    const lines = result.split("\n");
    assertEquals(lines.length, 4); // header + 3 data rows

    // Check header
    assertStringIncludes(lines[0], "Task");
    assertStringIncludes(lines[0], "Description");

    // Check data rows
    assertStringIncludes(lines[1], "test");
    assertStringIncludes(lines[1], "Run local unit tests");
    assertStringIncludes(lines[2], "lint");
    assertStringIncludes(lines[2], "Run local lint");
    assertStringIncludes(lines[3], "fmt");
    assertStringIncludes(lines[3], "Run local fmt");
  });

  await t.step("plain text table alignment", () => {
    const headings = ["Short", "Very Long Header"];
    const cells = [
      ["A", "Short"],
      ["Very Long Content", "B"],
    ];
    const result = plainTextTable(headings, cells);

    const lines = result.split("\n");
    assertEquals(lines.length, 3); // header + 2 data rows
    
    // Check that content is present and properly aligned
    assertStringIncludes(lines[0], "Short");
    assertStringIncludes(lines[0], "Very Long Header");
    assertStringIncludes(lines[1], "A");
    assertStringIncludes(lines[1], "Short");
    assertStringIncludes(lines[2], "Very Long Content");
    assertStringIncludes(lines[2], "B");
    
    // Check that columns start at consistent positions
    const shortPos = lines[0].indexOf("Short");
    const headerPos = lines[0].indexOf("Very Long Header");
    assertEquals(shortPos, 0);
    assertGreater(headerPos, shortPos + 5);
  });

  await t.step("plain text table with empty cells", () => {
    const headings = ["Name", "Value"];
    const cells = [
      ["Item1", ""],
      ["", "Value2"],
    ];
    const result = plainTextTable(headings, cells);

    assertStringIncludes(result, "Item1");
    assertStringIncludes(result, "Value2");
    
    const lines = result.split("\n");
    assertEquals(lines.length, 3); // header + 2 data rows
  });

  await t.step("plain text table with single column", () => {
    const headings = ["Status"];
    const cells = [["Active"], ["Inactive"]];
    const result = plainTextTable(headings, cells);

    const lines = result.split("\n");
    assertEquals(lines.length, 3); // header + 2 data rows
    assertEquals(lines[0].trim(), "Status");
    assertEquals(lines[1].trim(), "Active");
    assertEquals(lines[2].trim(), "Inactive");
  });
});

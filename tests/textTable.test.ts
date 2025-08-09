import { assertEquals } from "@std/assert";
import { textTable } from "../utils/textTable.ts";

Deno.test("textTable utilities", async (t) => {
  await t.step("basic table with single row", () => {
    const headings = ["Name", "Age"];
    const cells = [["John", "30"]];
    const result = textTable(headings, cells);
    
    // Should contain proper box drawing characters
    assertEquals(typeof result, "string");
    assertEquals(result.includes("┌"), true);
    assertEquals(result.includes("┐"), true);
    assertEquals(result.includes("└"), true);
    assertEquals(result.includes("┘"), true);
    assertEquals(result.includes("│"), true);
    assertEquals(result.includes("─"), true);
    
    // Should contain the data
    assertEquals(result.includes("Name"), true);
    assertEquals(result.includes("Age"), true);
    assertEquals(result.includes("John"), true);
    assertEquals(result.includes("30"), true);
  });

  await t.step("empty table with headers only", () => {
    const headings = ["Column1", "Column2"];
    const cells: string[][] = [];
    const result = textTable(headings, cells);
    
    assertEquals(typeof result, "string");
    assertEquals(result.includes("Column1"), true);
    assertEquals(result.includes("Column2"), true);
    // Should still have proper table structure
    assertEquals(result.includes("┌"), true);
    assertEquals(result.includes("┐"), true);
  });

  await t.step("multiple rows with varying lengths", () => {
    const headings = ["Short", "Very Long Header"];
    const cells = [
      ["A", "Short"],
      ["Very Long Content", "B"],
    ];
    const result = textTable(headings, cells);
    
    assertEquals(typeof result, "string");
    assertEquals(result.includes("Short"), true);
    assertEquals(result.includes("Very Long Header"), true);
    assertEquals(result.includes("Very Long Content"), true);
    
    // Should handle alignment properly
    const lines = result.split("\n");
    assertEquals(lines.length > 3, true); // At least headers, separator, and rows
  });

  await t.step("single column table", () => {
    const headings = ["Status"];
    const cells = [["Active"], ["Inactive"], ["Pending"]];
    const result = textTable(headings, cells);
    
    assertEquals(typeof result, "string");
    assertEquals(result.includes("Status"), true);
    assertEquals(result.includes("Active"), true);
    assertEquals(result.includes("Inactive"), true);
    assertEquals(result.includes("Pending"), true);
  });

  await t.step("table with special characters", () => {
    const headings = ["Symbols", "Unicode"];
    const cells = [
      ["!@#$%", "αβγδε"],
      ["^&*()", "中文测试"],
    ];
    const result = textTable(headings, cells);
    
    assertEquals(typeof result, "string");
    assertEquals(result.includes("!@#$%"), true);
    assertEquals(result.includes("αβγδε"), true);
    assertEquals(result.includes("^&*()"), true);
    assertEquals(result.includes("中文测试"), true);
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
    assertEquals(result.includes("Item1"), true);
    assertEquals(result.includes("Value2"), true);
    assertEquals(result.includes("Item3"), true);
    assertEquals(result.includes("Value3"), true);
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
      assertEquals(result.includes(i.toString()), true);
    }
    
    // Check all headers are present
    ["A", "B", "C", "D", "E"].forEach(header => {
      assertEquals(result.includes(header), true);
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
    lines.forEach(line => {
      assertEquals(line.length, firstLineLength);
    });
    
    // Should contain proper spacing around content
    assertEquals(result.includes(" ID "), true);
    assertEquals(result.includes(" Description "), true);
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
    assertEquals(result.includes("Alice"), true);
    assertEquals(result.includes("95.5"), true);
    assertEquals(result.includes("false"), true);
    
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
    assertEquals(lines[0].includes("┌"), true);
    assertEquals(lines[0].includes("┐"), true);
    assertEquals(lines[lines.length - 1].includes("└"), true);
    assertEquals(lines[lines.length - 1].includes("┘"), true);
    
    // Middle separator should contain cross characters
    assertEquals(lines[2].includes("├"), true);
    assertEquals(lines[2].includes("┤"), true);
  });
});
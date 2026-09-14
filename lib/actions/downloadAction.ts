"use server";

import ExcelJS from "exceljs";
import db from "../dbPool";

const round = (n: number) => Math.round(n * 100) / 100;

export async function generateExcel(
  startingMonth: number,
  startingYear: number,
  endingMonth: number,
  endingYear: number,

) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Invoices");

  const startDate = new Date(startingYear, startingMonth - 1, 1);

  const endDate = new Date(endingYear, endingMonth, 0);
  // last day of ending month

  // ✅ Query
  const [invoices]: any = await db.query(`
    SELECT invoice_date, client_name, sub_total, grand_total, invoice_id, CONCAT(client_city, ', ', client_state) AS address, cgst, sgst, igst, client_gst_no
    FROM invoice
    WHERE ( status = "paid" OR status = "pending" )
    AND client_gst_no IS NOT NULL
    AND invoice_date BETWEEN ? AND ?
    ORDER BY invoice_date
  `, [startDate, endDate]
  );

  const grouped: Record<string, any[]> = {};

  // ✅ Use created_at consistently
  invoices.forEach((row: any) => {
    const d = new Date(row.invoice_date);

    const key = `${d.toLocaleString("default", {
      month: "long",
    })} ${d.getFullYear()}`;

    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(row);
  });

  let currentRow = 5;

  for (const [month, data] of Object.entries(grouped)) {

    // 🟦 Month Title
    sheet.getCell(`C${currentRow}`).value = month;
    sheet.getCell(`C${currentRow}`).font = { bold: true, size: 20 };
    currentRow++;

    // 🟩 Header (fixed)
    const headerRow = sheet.addRow([
      "",
      "",
      "S.no",
      "Bill Date",
      "Invoice NO",
      "Client",
      "GST No",
      "Address",
      "Taxable Total",
      "CGST",
      "SGST",
      "IGST",
      "Bill Amount",
    ]);
    headerRow.font = { bold: true };
    currentRow++;

    headerRow.eachCell((cell, colNumber) => {
      if (colNumber === 1 || colNumber === 2) return;
      cell.font = {
        bold: true,
        color: { argb: "EEEEEE" },
      };

      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "1F6F5F" },
      };

      cell.alignment = {
        vertical: "middle",
        horizontal: "center",
      };

      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };
    });
    let sno = 1;
    data.forEach((row: any) => {
      sheet.addRow([
        "",
        "",
        sno++,
        new Date(row.invoice_date).toISOString().split("T")[0],
        row.invoice_id,
        row.client_name,
        row.client_gst_no,
        row.address,
        parseFloat(row.sub_total) || 0,
        parseFloat(row.cgst) || 0,
        parseFloat(row.sgst) || 0,
        parseFloat(row.igst) || 0,
        parseFloat(row.grand_total) || 0,
      ]);
      currentRow++;
    });

    const invoiceTotals = data.reduce((acc, row) => {
      acc.taxable += parseFloat(row.sub_total) || 0;
      acc.cgst += parseFloat(row.cgst) || 0;
      acc.sgst += parseFloat(row.sgst) || 0;
      acc.igst += parseFloat(row.igst) || 0;
      acc.total += parseFloat(row.grand_total) || 0;
      return acc;
    }, {
      taxable: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      total: 0
    });

    // 🔥 Monthly total (very useful)
    const totalRow = sheet.addRow([
      "", "", "", "", "", "", "",
      "Total",
      round(invoiceTotals.taxable),
      round(invoiceTotals.cgst),
      round(invoiceTotals.sgst),
      round(invoiceTotals.igst),
      round(invoiceTotals.total)
    ]);
    totalRow.font = { bold: true };

    totalRow.eachCell((cell, colNumber) => {
      if (colNumber === 1 || colNumber === 2) return;
      cell.font = {
        bold: true,
        color: { argb: "FFFFFFFF" },
      };

      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "30364F" },
      };

      cell.alignment = {
        vertical: "middle",
        horizontal: "right",
      };

      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };
    });

    if (!data.length) continue;

    // ➖ spacing
    currentRow += 4;

    const monthDate = new Date(data[0].invoice_date);

    const [items]: any = await db.query(
      `
      SELECT 
      bill_date,
      bill_no,
      bill_file,
      item_name,
      hsn_code,
      supplier_gstin,
      taxable_amount,
      cgst_amount,
      sgst_amount,
      igst_amount,
      total_amount
      FROM purchase_adjustments
      WHERE MONTH(bill_date) = ? 
      AND YEAR(bill_date) = ?
      ORDER BY bill_date
      `,
      [monthDate.getMonth() + 1, monthDate.getFullYear()]
    );

    // 🟨 Adjustment Title
    sheet.getCell(`C${currentRow}`).value = "Input (Tax Reduction)";
    sheet.getCell(`C${currentRow}`).font = { bold: true, size: 12 };
    currentRow++;

    // 🟩 Header
    const adjHeader = sheet.addRow([
      "",
      "",
      "S.no",
      "Bill Date",
      "Bill No",
      "Item",
      "HSN",
      "Supplier GSTIN",
      "Taxable Amount",
      "CGST",
      "SGST",
      "IGST",
      "Total Amount",
      "View Bill"
    ]);

    adjHeader.eachCell((cell, colNumber) => {
      if (colNumber === 1 || colNumber === 2) return;
      cell.font = { bold: true, color: { argb: "30364F" } };

      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "F0F0DB" }, // different color from invoice
      };

      cell.alignment = { vertical: "middle", horizontal: "center" };

      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };
    });

    currentRow++;

    // 🧾 Data rows
    sno = 1;
    items.forEach((item: any) => {
      const row = sheet.addRow([
        "",
        "",
        sno++,
        new Date(item.bill_date).toISOString().split("T")[0],
        item.bill_no,
        item.item_name,
        item.hsn_code,
        item.supplier_gstin,
        parseFloat(item.taxable_amount) || 0,
        parseFloat(item.cgst_amount) || 0,
        parseFloat(item.sgst_amount) || 0,
        parseFloat(item.igst_amount) || 0,
        parseFloat(item.total_amount) || 0,
        "" // placeholder for bill column
      ])

      const billCell = row.getCell(14)

      if (item.bill_file) {
        billCell.value = {
          text: "View Bill",
          hyperlink: item.bill_file
        }

        billCell.font = {
          color: { argb: "FF0000FF" },
          underline: false
        }
      } else {
        billCell.value = "No File"
      }

      currentRow++
    })


    const adjTotals = items.reduce((
      acc: { taxable: number; cgst: number; sgst: number; igst: number; total: number },
      item: any
    ) => {
      acc.taxable += parseFloat(item.taxable_amount) || 0;
      acc.cgst += parseFloat(item.cgst_amount) || 0;
      acc.sgst += parseFloat(item.sgst_amount) || 0;
      acc.igst += parseFloat(item.igst_amount) || 0;
      acc.total += parseFloat(item.total_amount) || 0;
      return acc;
    }, {
      taxable: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      total: 0
    });

    const outputGST = {
      cgst: round(invoiceTotals.cgst),
      sgst: round(invoiceTotals.sgst),
      igst: round(invoiceTotals.igst)
    };

    const inputGST = {
      cgst: round(adjTotals.cgst),
      sgst: round(adjTotals.sgst),
      igst: round(adjTotals.igst)
    };

    const netGST = {
      cgst: round(outputGST.cgst - inputGST.cgst),
      sgst: round(outputGST.sgst - inputGST.sgst),
      igst: round(outputGST.igst - inputGST.igst)
    };


    const direct = {
      cgst: round(Math.max(0, netGST.cgst)),
      sgst: round(Math.max(0, netGST.sgst)),
      igst: round(Math.max(0, netGST.igst))
    };

    const finalGST = {
      cgst: round(Math.max(0, direct.cgst - Math.max(0, -netGST.igst))),
      sgst: round(Math.max(
        0,
        direct.sgst - Math.max(0, Math.max(0, -netGST.igst) - direct.cgst))
      ),
      igst: round(Math.max(0, netGST.igst))
    };

    const carryForward = {
      cgst: 0,
      sgst: 0,
      igst: round(
        Math.max(
          0,
          Math.max(0, -netGST.igst) - direct.cgst - direct.sgst
        )
      )
    };

    // 🔥 Total Row
    const adjTotalRow = sheet.addRow([
      "", "", "", "", "", "", "", "Total",
      round(adjTotals.taxable),
      round(adjTotals.cgst),
      round(adjTotals.sgst),
      round(adjTotals.igst),
      round(adjTotals.total),
    ]);

    adjTotalRow.eachCell((cell, colNumber) => {
      if (colNumber === 1 || colNumber === 2) return;
      cell.font = { bold: true, color: { argb: "30364F" } };

      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "EEEEEE" },
      };

      cell.alignment = { vertical: "middle", horizontal: "right" };

      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // 🧾 GST Summary
    sheet.mergeCells(`C${currentRow}:D${currentRow}`);

    const cell = sheet.getCell(`C${currentRow}`);
    cell.value = "GST Calculation";
    cell.font = { bold: true, size: 13 };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    currentRow++;

    sheet.addRow(["", "", "", "", "", "", "", "Output GST", "", outputGST.cgst, outputGST.sgst, outputGST.igst]);

    sheet.addRow(["", "", "", "", "", "", "", "Input GST", "", inputGST.cgst, inputGST.sgst, inputGST.igst]);

    sheet.addRow(["", "", "", "", "", "", "", "ITC Set-off", "", direct.cgst, direct.sgst, direct.igst]);

    sheet.addRow(["", "", "", "", "", "", "", "GST Before Set-off", "", netGST.cgst, netGST.sgst, netGST.igst]);

    const netPayable = sheet.addRow(["", "", "", "", "", "", "", "Final GST Payable", "", finalGST.cgst, finalGST.sgst, finalGST.igst]);
    netPayable.font = { bold: true };


    sheet.addRow([
      "", "", "", "", "", "", "",
      "Remaining ITC (Carry Forward)",
      "",
      carryForward.cgst,
      carryForward.sgst,
      carryForward.igst
    ]);

    currentRow += 10;
  }

  // ✅ Column widths
  sheet.columns = [
    { width: 15 },
    { width: 15 },
    { width: 10 },
    { width: 20 },
    { width: 20 },
    { width: 30 },
    { width: 20 },
    { width: 30 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
  ];

  const buffer = await workbook.xlsx.writeBuffer();

  return buffer;
}
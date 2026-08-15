# Wide Research Notes

## ERP operating-model references

### Order-to-cash and quote-to-cash
IBM describes order-to-cash as the end-to-end process from customer order through fulfillment, payment receipt, and recording the completed sale. It distinguishes quote-to-cash as the broader lifecycle that begins earlier with quote preparation, negotiation, and finalization of terms.[1] The reference emphasizes that O2C crosses sales, credit, distribution/logistics, accounts receivable, and reporting rather than living inside one page. It identifies order capture, pricing/item-master checks, discounting, shipping, inventory updates, invoice creation, receivables, payment collection, and metrics as connected stages.[1]

The audit implication is that a quotation, proforma, sales order, invoice, delivery, receipt, outstanding balance, client account, and reports should be linked records in one lifecycle. A successful UI conversion without persisted lineage or downstream balance/reporting effects is not a complete workflow.

### Procure-to-pay
IBM describes P2P as the complete cycle from requisition and sourcing through purchase order, receiving, invoice review, and payment.[2] It explicitly describes receiving verification, invoice/PO/receipt matching, approval before payment, financial commitments, audit trails, and real-time reporting as integrated controls.[2] NetSuite similarly describes a seven-step P2P process: identify need, select supplier, manage contract, create PO, fulfill/receive, manage/match invoice, and process payment.[3]

The audit implication is that NIFHDPE procurement must not stop at PO creation. It should preserve the request/source, supplier, PO, PO items, goods receipt, accepted/rejected quantities, supplier invoice, three-way match state, approval, payment, account lineage, bank-analysis link, inventory movement, and financial reporting effects.

## HDPE pipe operating-model references

PE100+ states that PE pipe and fittings are marked with material grade, manufacturer/trade mark, compound code, diameter, pressure rating, and manufacture date/code. Those markings support traceability through resin grade, batch test results, process conditions, and quality assurance records.[4] It also describes end-to-end traceability from resin batch through extrusion, utility/installer operations, and site installation. Barcode traceability can encode pipe/fitting data, fusion equipment and operator, site location, fusion parameters, installation date, and assembly procedure; ISO 12176-4 is identified as a traceability standard for these elements.[4]

The audit implication is that NIFHDPE product master, inventory, lot/batch, product specification, quality records, fusion/service records, delivery, project/site, and document attachments should be connected. A generic inventory item without specification, batch, quality, or delivery lineage is insufficient for industrial HDPE operations.

PPI describes itself as a plastics-pipe industry authority focused on research, education, technical expertise, applications, and acceptance of plastic pipe systems.[5] This supports using industry-specific product and quality traceability as ERP design constraints rather than treating NIFHDPE as a generic trading ledger.

## Sources

[1]: https://www.ibm.com/think/topics/order-to-cash-o2c "IBM — What Is Order to Cash (O2C)?"
[2]: https://www.ibm.com/think/topics/procure-to-pay "IBM — Procure to Pay (P2P)"
[3]: https://www.netsuite.com/portal/resource/articles/erp/procure-pay.shtml "Oracle NetSuite — Procure-to-Pay Process"
[4]: https://www.pe100plus.com/PE-Pipes/Technical-guidance/model/Materials/product/How-can-I-verify-the-origin-of-the-pipe-and-fittings-i262.html "PE100+ — How can I verify the origin of the pipe and fittings?"
[5]: https://plasticpipe.org/PPI-Home/PPI-Home/Default.aspx "Plastics Pipe Institute — Mission and industry role"

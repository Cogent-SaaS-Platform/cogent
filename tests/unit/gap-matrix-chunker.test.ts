import { describe, it, expect } from 'vitest';
import {
  PolicyStructureExtractor,
  defaultPolicyStructureExtractor,
} from '@/modules/gap-matrix/services/policyStructureExtractor';

describe('Epic 14: Policy Document Ingestion & Structural Chunking Pipeline', () => {
  const extractor = new PolicyStructureExtractor();

  it('extracts hierarchical decimal section numbers (3.1, 3.2.1) and titles', async () => {
    const rawPolicyText = `
# Apex FinTech AML/CFT Operational Manual

### 1.0 General Provisions and Scope
This manual establishes the mandatory AML/CFT controls for all digital wallet operations.

### 2.1 Customer Due Diligence
Every customer must be onboarded using verified BVN or NIN credentials.

### 3.2 Enhanced Due Diligence
Enhanced scrutiny applies to foreign high-risk jurisdictions.

### 3.2.1 Mandatory Senior Management Approval
All Politically Exposed Persons (PEPs) require written approval from the Managing Director prior to account opening.

### 4.1 Suspicious Transaction Reporting Window
All suspicious transactions must be reported to the NFIU within 72 hours of detection.
`;

    const structure = await extractor.extractStructure({
      rawText: rawPolicyText,
      department: 'COMPLIANCE_LEGAL',
      versionTag: '2.0',
    });

    expect(structure.title).toBe('Apex FinTech AML/CFT Operational Manual');
    expect(structure.department).toBe('COMPLIANCE_LEGAL');
    expect(structure.versionTag).toBe('2.0');
    expect(structure.clauses.length).toBeGreaterThanOrEqual(4);

    const sectionNumbers = structure.clauses.map((c) => c.sectionNumber);
    expect(sectionNumbers).toContain('Section 1.0');
    expect(sectionNumbers).toContain('Section 2.1');
    expect(sectionNumbers).toContain('Section 3.2.1');
    expect(sectionNumbers).toContain('Section 4.1');

    const pepClause = structure.clauses.find((c) => c.sectionNumber === 'Section 3.2.1');
    expect(pepClause).toBeDefined();
    expect(pepClause!.clauseText).toContain('Politically Exposed Persons (PEPs)');
  });

  it('extracts section headers with prefix (Section 4, Clause 5)', async () => {
    const text = `
Section 1 - Customer Credit Assessment:
All credit applications must undergo strict debt-service ratio assessment before disbursement.

Section 2 - Maximum Lending Interest Rate:
The total cost of credit including interest and processing fees shall not exceed statutory caps.

Clause 3: Default Notification Procedures:
Borrowers shall receive written reminder notices at 3, 7, and 14 days post default.
`;

    const clauses = extractor.chunkPolicyText(text);
    expect(clauses.length).toBe(3);
    expect(clauses[0].sectionNumber).toBe('Section 1');
    expect(clauses[1].sectionNumber).toBe('Section 2');
    expect(clauses[2].sectionNumber).toBe('Section 3');
  });

  it('falls back gracefully to paragraph-level chunking for unstructured policy text', async () => {
    const unstructuredText = `
The company operates an electronic funds transfer platform regulated by the Central Bank of Nigeria. All systems must maintain 99.99% availability.

Data protection and encryption standards must follow NDPA 2023 regulations. Customer personal information must be encrypted both in transit (TLS 1.3) and at rest (AES-256).

Security incidents involving data breaches or unauthorized account intrusions must be reported to the Nigeria Data Protection Commission within seventy-two hours of occurrence.
`;

    const clauses = extractor.chunkPolicyText(unstructuredText);
    expect(clauses.length).toBe(3);
    expect(clauses[0].sectionNumber).toBe('Section 1.0');
    expect(clauses[1].sectionNumber).toBe('Section 2.0');
    expect(clauses[2].sectionNumber).toBe('Section 3.0');
    expect(clauses[1].clauseText).toContain('Data protection and encryption standards');
  });

  it('correctly tracks page numbers when indicated in raw document streams', async () => {
    const text = `
Section 1.0 Governance
Board risk committee meets quarterly.

--- Page 2 ---
Section 2.0 Whistleblowing Policy
Employees may report compliance violations confidentially.
`;

    const clauses = extractor.chunkPolicyText(text);
    expect(clauses.length).toBe(2);
    expect(clauses[0].pageNumber).toBe(1);
    expect(clauses[1].pageNumber).toBe(2);
  });
});

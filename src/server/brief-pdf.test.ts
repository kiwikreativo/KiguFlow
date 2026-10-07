import { describe, expect, it } from 'vitest';
import { createBriefPdf } from './brief-pdf';

describe('brief PDF', () => {
  it('creates a multi-page PDF from persisted-style Unicode answers', () => {
    const fields=Array.from({length:45},(_,index)=>({id:`field-${index}`,label:`Pregunta ${index+1}`,type:'long_text'}));
    const bytes=createBriefPdf({businessName:'KiguDev',briefName:'Geographic SEO Brief',clientName:'María Solís',companyName:'Compañía Ñ',projectName:'Costa Rica + Panamá',serviceName:'Geographic SEO',finalizedAt:new Date('2026-09-27T12:00:00Z'),fields,responses:fields.map(field=>({fieldId:field.id,value:'Información geográfica persistida para múltiples ciudades y países.'}))});
    const content=new TextDecoder().decode(bytes);
    expect(content.startsWith('%PDF-1.4')).toBe(true);
    expect(content).toMatch(/\/Count [2-9]/);
    expect(content).toContain('CLIENT BRIEF');
  });
});

import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { createDatabase } from '../src/server/db';
import { users, clients, projects, projectTemplates, templatePhases, templateTasks, projectPhases, tasks, invoices, activityLogs } from '../src/db/schema';
import { hashPassword } from '../src/server/security';

if (!process.env.DATABASE_URL || !process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) throw new Error('DATABASE_URL, ADMIN_EMAIL, and ADMIN_PASSWORD are required');
const db = createDatabase(process.env.DATABASE_URL);
if (!(await db.select().from(users).where(eq(users.email, process.env.ADMIN_EMAIL.toLowerCase())).limit(1))[0]) await db.insert(users).values({ name: 'KiguFlow Admin', businessName: 'KiguDev', email: process.env.ADMIN_EMAIL.toLowerCase(), passwordHash: await hashPassword(process.env.ADMIN_PASSWORD) });

const templates = [
  { name: 'Website Development', phases: [
    ['Onboarding',['Send welcome information','Upload contract','Confirm signed contract','Create initial invoice','Confirm initial payment','Send client brief','Client completes brief','Client uploads logo','Client uploads branding assets']],
    ['Discovery',['Review client brief','Research competitors','Define website goals','Define sitemap','Confirm project scope']],
    ['UI/UX Design',['Create design direction','Design homepage','Review homepage internally','Send homepage for client approval','Client approves homepage','Design internal pages']],
    ['Development',['Initialize project','Build global layout','Build navigation','Develop homepage','Develop service pages','Develop contact page','Implement responsive behavior','Implement forms']],
    ['Testing',['Cross-browser testing','Mobile testing','Accessibility review','Performance optimization','Fix identified issues']],
    ['Client Review',['Send staging website','Client reviews website','Collect requested adjustments','Implement approved adjustments','Client gives final approval']],
    ['Launch',['Configure production environment','Configure domain','Deploy website','Verify SSL','Run production tests']],
    ['Delivery',['Deliver final documentation','Deliver credentials','Create final invoice','Confirm final payment','Mark project completed']],
  ]},
  { name: 'Local SEO', phases: [
    ['Onboarding',['Collect business information','Collect website access','Collect Google Business Profile information','Confirm target locations','Confirm primary services']],
    ['Audit',['Website SEO audit','Google Business Profile audit','Local competitor research','Citation audit','Technical SEO review']],
    ['Keyword Research',['Research local keywords','Group keywords by intent','Map keywords to pages','Confirm priority keywords']],
    ['On-Page SEO',['Optimize title tags','Optimize meta descriptions','Optimize headings','Optimize service content','Improve internal linking','Add local signals']],
    ['Local SEO',['Optimize Google Business Profile','Review business categories','Review NAP consistency','Review local citations','Create local content recommendations']],
    ['Technical SEO',['Review sitemap','Review robots.txt','Review canonical tags','Review indexing','Improve Core Web Vitals where applicable']],
    ['Reporting',['Create baseline report','Document completed work','Create recommendations','Deliver report to client']],
  ]},
  { name: 'Website Redesign', phases: [['Discovery',['Audit current website','Confirm redesign goals']],['Design',['Create design direction','Approve homepage']],['Development',['Build approved pages','Responsive implementation']],['Delivery',['Production launch','Handoff documentation']]] },
  { name: 'Website Performance Optimization', phases: [['Audit',['Measure Core Web Vitals','Profile page weight']],['Optimization',['Optimize images','Reduce render blocking work']],['Verification',['Repeat field tests','Deliver report']]] },
  { name: 'Website Maintenance', phases: [['Intake',['Confirm maintenance scope']],['Maintenance',['Apply updates','Review backups']],['Quality assurance',['Test critical flows','Send maintenance report']]] },
] as const;
for (const template of templates) { let row = (await db.select().from(projectTemplates).where(eq(projectTemplates.name, template.name)).limit(1))[0]; if (!row) [row] = await db.insert(projectTemplates).values({ name: template.name }).returning(); const existing = await db.select().from(templatePhases).where(eq(templatePhases.templateId, row.id)); if (!existing.length) for (const [phaseName, phaseTasks] of template.phases) { const [phase] = await db.insert(templatePhases).values({ templateId: row.id, name: phaseName, sortOrder: template.phases.findIndex((p) => p[0] === phaseName) }).returning(); await db.insert(templateTasks).values(phaseTasks.map((title, index) => { const clientOwned = /client|upload|approve|business information|access/i.test(title); return { phaseId: phase.id, title, sortOrder: index, clientVisible: /client|upload|approve|contract|payment|business|access/i.test(title), assigneeType: clientOwned ? 'client' as const : 'admin' as const, requiresClientAction: clientOwned }; })); } }

const existingDemo = (await db.select().from(clients).where(eq(clients.email, 'joshua@example.com')).limit(1))[0];
if (!existingDemo) { const [client] = await db.insert(clients).values({ name: 'Joshua Vega', companyName: 'MEGUIS', email: 'joshua@example.com' }).returning(); const [project] = await db.insert(projects).values({ clientId: client.id, name: 'Website Redesign', description: 'A focused redesign and development project for a clearer, faster company website.', serviceType: 'Website Redesign', status: 'in_progress', startDate: new Date().toISOString().slice(0,10), dueDate: new Date(Date.now()+1000*60*60*24*35).toISOString().slice(0,10) }).returning(); const phaseNames=['Onboarding','Discovery','UI/UX Design','Development','Testing','Client Review','Launch']; const phases=[]; for(let i=0;i<phaseNames.length;i++){const [phase]=await db.insert(projectPhases).values({projectId:project.id,name:phaseNames[i],sortOrder:i,status:i<3?'completed':i===3?'active':'not_started'}).returning();phases.push(phase)} await db.insert(tasks).values([{projectId:project.id,phaseId:phases[0].id,title:'Sign project contract',status:'completed',clientVisible:true,assigneeType:'client',completedAt:new Date()},{projectId:project.id,phaseId:phases[3].id,title:'Develop responsive homepage',status:'in_progress',priority:'high',clientVisible:true},{projectId:project.id,phaseId:phases[3].id,title:'Upload final product information',status:'waiting_for_client',assigneeType:'client',clientVisible:true,requiresClientAction:true,dueDate:new Date(Date.now()+86400000*5).toISOString().slice(0,10)}]); await db.insert(invoices).values({projectId:project.id,invoiceNumber:'INV-001',description:'Initial project payment',amountMinor:200000,currency:'CRC',status:'paid',issueDate:new Date().toISOString().slice(0,10)}); await db.insert(activityLogs).values({projectId:project.id,clientId:client.id,actorType:'system',eventType:'project.created',summary:'Project workspace created',clientVisible:true}); }
console.log('KiguFlow development data seeded.');

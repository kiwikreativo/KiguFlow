import { describe, expect, it } from 'vitest'; import { calculateProgress } from './progress';
describe('project progress',()=>{it('returns zero for an empty project',()=>expect(calculateProgress([])).toBe(0));it('uses every persisted project task as progress eligible',()=>expect(calculateProgress(['completed','completed','in_progress'])).toBe(67));});

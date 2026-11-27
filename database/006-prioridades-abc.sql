ALTER TABLE chamados DROP CONSTRAINT IF EXISTS chamados_prioridade_check;
UPDATE chamados SET prioridade=CASE WHEN prioridade IN ('critica','alta') THEN 'A' WHEN prioridade='media' THEN 'B' WHEN prioridade='baixa' THEN 'C' ELSE prioridade END;
ALTER TABLE chamados ADD CONSTRAINT chamados_prioridade_check CHECK (prioridade IN ('A','B','C'));

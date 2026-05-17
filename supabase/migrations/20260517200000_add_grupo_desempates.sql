CREATE TABLE grupo_desempates (
  grupo  VARCHAR(2)  NOT NULL,
  equipo VARCHAR(50) NOT NULL,
  orden  INTEGER     NOT NULL,
  PRIMARY KEY (grupo, equipo)
);

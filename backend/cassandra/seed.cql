-- SEMAPA — Datos seed para desarrollo/demo
USE semapa;

-- Distritos
INSERT INTO distritos (id,nombre,subalcaldia,consumo_m3,presion_psi,poblacion,medidores_total,cobertura_pct,calidad_ica,temperatura_c,status) VALUES (1,'D-1 Norte','Adela Zamudio',310.0,15.2,52400,8500,95.5,82,18.2,'normal');
INSERT INTO distritos (id,nombre,subalcaldia,consumo_m3,presion_psi,poblacion,medidores_total,cobertura_pct,calidad_ica,temperatura_c,status) VALUES (9,'D-9 Molle','Molle',410.0,14.2,58800,9200,94.5,80,18.8,'alta-demanda');
INSERT INTO distritos (id,nombre,subalcaldia,consumo_m3,presion_psi,poblacion,medidores_total,cobertura_pct,calidad_ica,temperatura_c,status) VALUES (10,'D-10 Central','Molle',520.0,12.5,64500,10200,94.1,78,19.4,'critico');
INSERT INTO distritos (id,nombre,subalcaldia,consumo_m3,presion_psi,poblacion,medidores_total,cobertura_pct,calidad_ica,temperatura_c,status) VALUES (12,'D-12 Industrial','Itocta',480.0,11.2,35600,5400,94.4,65,20.8,'critico');

-- Inmuebles (contratos)
INSERT INTO inmuebles (contrato,ci,nombre,direccion,zona,distrito_id,categoria,medidor_serie,medidor_modelo,instalacion,estado_servicio,consumo_actual_m3,consumo_anterior_m3,deuda_total) VALUES ('CBB-00123456','7890123','García Vargas, María Elena','Av. Ayacucho 1234','Zona 1',10,'R3-Residencial','ITC100-123456','ITC 100','2021-03-15','al-dia',22.0,19.0,0.0);
INSERT INTO inmuebles (contrato,ci,nombre,direccion,zona,distrito_id,categoria,medidor_serie,medidor_modelo,instalacion,estado_servicio,consumo_actual_m3,consumo_anterior_m3,deuda_total) VALUES ('CBB-00291122','4812003','Industrias El Prado Ltda.','Av. Blanco Galindo Km 8','Zona 1',12,'Industrial','OY1320-229912','OY1320','2019-08-01','moroso',145.0,138.0,32100.0);
INSERT INTO inmuebles (contrato,ci,nombre,direccion,zona,distrito_id,categoria,medidor_serie,medidor_modelo,instalacion,estado_servicio,consumo_actual_m3,consumo_anterior_m3,deuda_total) VALUES ('CBB-00448821','7123456','Torres Mamani, Roberto','Calle Lanza 456','Zona 3',9,'R4-Residencial Alta','WP20-448821','WP20','2022-05-20','moroso',58.0,51.0,4280.0);
INSERT INTO inmuebles (contrato,ci,nombre,direccion,zona,distrito_id,categoria,medidor_serie,medidor_modelo,instalacion,estado_servicio,consumo_actual_m3,consumo_anterior_m3,deuda_total) VALUES ('CBB-00561234','5567890','Quispe Laura, Pedro','Calle Baptista 789','Zona 2',5,'R2-Social','LAIN-561234','LAIN IoT','2023-01-10','al-dia',13.0,12.0,0.0);
INSERT INTO inmuebles (contrato,ci,nombre,direccion,zona,distrito_id,categoria,medidor_serie,medidor_modelo,instalacion,estado_servicio,consumo_actual_m3,consumo_anterior_m3,deuda_total) VALUES ('CBB-00891230','9012345','Construcciones J&R SAC','Av. Industrial 890','Zona 1',12,'Industrial','OY1320-891230','OY1320','2018-03-20','suspendido',210.0,198.0,24500.0);

-- Morosos
INSERT INTO morosos (contrato,nombre,zona,distrito_id,categoria,deuda_total,meses_deuda,ultimo_pago,medidor_serie) VALUES ('CBB-00291122','Industrias El Prado Ltda.','Zona 1',12,'Industrial',32100.0,11,'2024-06-10','OY1320-229912');
INSERT INTO morosos (contrato,nombre,zona,distrito_id,categoria,deuda_total,meses_deuda,ultimo_pago,medidor_serie) VALUES ('CBB-00891230','Construcciones J&R SAC','Zona 1',12,'Industrial',24500.0,9,'2024-08-10','OY1320-891230');
INSERT INTO morosos (contrato,nombre,zona,distrito_id,categoria,deuda_total,meses_deuda,ultimo_pago,medidor_serie) VALUES ('CBB-00448821','Torres Mamani, Roberto','Zona 3',9,'R4-Residencial Alta',4280.0,6,'2024-11-10','WP20-448821');

-- Cierre mensual
INSERT INTO cierre_mensual (periodo,facturado,cobrado,pendiente,incobrables,eficiencia,cerrado_en) VALUES ('May-2025',5243100.0,4580900.0,498200.0,164000.0,87.4,toTimestamp(now()));
INSERT INTO cierre_mensual (periodo,facturado,cobrado,pendiente,incobrables,eficiencia,cerrado_en) VALUES ('Abr-2025',5128600.0,4512800.0,472100.0,143700.0,88.0,toTimestamp(now()));
INSERT INTO cierre_mensual (periodo,facturado,cobrado,pendiente,incobrables,eficiencia,cerrado_en) VALUES ('Mar-2025',5012400.0,4430600.0,445200.0,136600.0,88.4,toTimestamp(now()));

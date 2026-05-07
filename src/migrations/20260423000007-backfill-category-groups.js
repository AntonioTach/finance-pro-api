'use strict';

const GROUPS = [
  // Gastos — Alimentación
  ['Supermercado',            'expense', 'Alimentación'],
  ['Restaurantes',            'expense', 'Alimentación'],
  ['Cafeterías',              'expense', 'Alimentación'],
  ['Comida Rápida',           'expense', 'Alimentación'],
  ['Bares y Antros',          'expense', 'Alimentación'],
  ['Despensa',                'expense', 'Alimentación'],
  // Gastos — Transporte
  ['Gasolina',                'expense', 'Transporte'],
  ['Transporte Público',      'expense', 'Transporte'],
  ['Uber / Taxi',             'expense', 'Transporte'],
  ['Estacionamiento',         'expense', 'Transporte'],
  ['Mantenimiento Auto',      'expense', 'Transporte'],
  ['Viajes',                  'expense', 'Transporte'],
  // Gastos — Hogar
  ['Renta / Hipoteca',        'expense', 'Hogar'],
  ['Luz',                     'expense', 'Hogar'],
  ['Agua',                    'expense', 'Hogar'],
  ['Gas',                     'expense', 'Hogar'],
  ['Internet / Telefonía',    'expense', 'Hogar'],
  ['Limpieza del Hogar',      'expense', 'Hogar'],
  ['Muebles y Decoración',    'expense', 'Hogar'],
  ['Mantenimiento Hogar',     'expense', 'Hogar'],
  // Gastos — Salud
  ['Médico / Consultas',      'expense', 'Salud'],
  ['Farmacia',                'expense', 'Salud'],
  ['Dental',                  'expense', 'Salud'],
  ['Salud Mental',            'expense', 'Salud'],
  ['Gimnasio',                'expense', 'Salud'],
  ['Deportes',                'expense', 'Salud'],
  // Gastos — Educación
  ['Educación',               'expense', 'Educación'],
  ['Cursos y Capacitación',   'expense', 'Educación'],
  ['Libros',                  'expense', 'Educación'],
  // Gastos — Entretenimiento
  ['Suscripciones Digitales', 'expense', 'Entretenimiento'],
  ['Cine y Teatro',           'expense', 'Entretenimiento'],
  ['Videojuegos',             'expense', 'Entretenimiento'],
  ['Música',                  'expense', 'Entretenimiento'],
  ['Salidas y Eventos',       'expense', 'Entretenimiento'],
  ['Hobbies',                 'expense', 'Entretenimiento'],
  // Gastos — Personal
  ['Ropa y Calzado',          'expense', 'Personal'],
  ['Belleza y Cuidado Personal', 'expense', 'Personal'],
  ['Mascotas',                'expense', 'Personal'],
  ['Niños y Bebés',           'expense', 'Personal'],
  ['Regalos',                 'expense', 'Personal'],
  // Gastos — Finanzas
  ['Seguros',                 'expense', 'Finanzas'],
  ['Impuestos',               'expense', 'Finanzas'],
  ['Pagos de Tarjeta',        'expense', 'Finanzas'],
  ['Préstamos',               'expense', 'Finanzas'],
  ['Ahorro Programado',       'expense', 'Finanzas'],
  ['Donaciones',              'expense', 'Finanzas'],
  // Gastos — Tecnología
  ['Tecnología y Gadgets',    'expense', 'Tecnología'],
  // Gastos — Otros
  ['Otros Gastos',            'expense', 'Otros'],

  // Ingresos — Trabajo
  ['Salario',                 'income', 'Trabajo'],
  ['Nómina Extra',            'income', 'Trabajo'],
  ['Freelance',               'income', 'Trabajo'],
  ['Honorarios',              'income', 'Trabajo'],
  ['Comisiones',              'income', 'Trabajo'],
  ['Propinas',                'income', 'Trabajo'],
  ['Bonos',                   'income', 'Trabajo'],
  ['Horas Extra',             'income', 'Trabajo'],
  // Ingresos — Inversiones
  ['Inversiones',             'income', 'Inversiones'],
  ['Dividendos',              'income', 'Inversiones'],
  ['Intereses Bancarios',     'income', 'Inversiones'],
  ['Criptomonedas',           'income', 'Inversiones'],
  ['Venta de Activos',        'income', 'Inversiones'],
  // Ingresos — Rentas
  ['Renta de Propiedad',      'income', 'Rentas'],
  ['Airbnb / Renta Temporal', 'income', 'Rentas'],
  // Ingresos — Ventas
  ['Ventas en Línea',         'income', 'Ventas'],
  ['Ventas de Artículos',     'income', 'Ventas'],
  // Ingresos — Otros
  ['Reembolsos',              'income', 'Otros'],
  ['Becas',                   'income', 'Otros'],
  ['Pensión',                 'income', 'Otros'],
  ['Regalos Recibidos',       'income', 'Otros'],
  ['Premio / Lotería',        'income', 'Otros'],
  ['Préstamo Recibido',       'income', 'Otros'],
  ['Otros Ingresos',          'income', 'Otros'],
];

module.exports = {
  async up(queryInterface) {
    for (const [name, type, group] of GROUPS) {
      await queryInterface.sequelize.query(
        `UPDATE categories SET "group" = :group WHERE name = :name AND type = :type AND "group" IS NULL`,
        { replacements: { group, name, type } },
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `UPDATE categories SET "group" = NULL WHERE "group" IS NOT NULL`,
    );
  },
};

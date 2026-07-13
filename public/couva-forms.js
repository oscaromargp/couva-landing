/* Captura de formularios directo a Supabase (funciona sin n8n).
   Claves públicas por diseño; RLS solo permite INSERT, no lectura. */
(function () {
  var SB_URL = 'https://aekdukfjftzbbrixuqbk.supabase.co';
  var SB_ANON = 'sb_publishable__QHR3TiiXE5i4ECjTMFkSA_uWrAV8F0';

  function build(b) {
    var form = b.form || 'lead';
    var isRef = form === 'referral' || form === 'socio';
    var ref = b.ref_codigo || null;
    var utm = {
      utm_source: b.utm_source || null, utm_medium: b.utm_medium || null,
      utm_campaign: b.utm_campaign || null, utm_content: b.utm_content || null,
      utm_term: b.utm_term || null, referrer: b.referrer || null, landing_path: b.landing_path || null,
    };
    if (isRef) {
      return { table: 'referidos', rec: {
        nombre: b.nombre || null, email: b.email || null, telefono: b.telefono || null,
        tipo: b.tipo || null, zona: b.zona || null, mensaje: b.mensaje || null,
        prospecto_nombre: b.prospecto_nombre || null, prospecto_contacto: b.prospecto_contacto || null,
        codigo: b.codigo || null, idioma: b.idioma || 'es',
        utm_source: utm.utm_source, utm_campaign: utm.utm_campaign, consentimiento: !!b.consentimiento,
      }};
    }
    var rec = {
      nombre: b.nombre || null, email: b.email || null, telefono: b.telefono || null,
      idioma: b.idioma || 'es', mensaje: b.mensaje || null, ref_codigo: ref,
      utm_source: utm.utm_source, utm_medium: utm.utm_medium, utm_campaign: utm.utm_campaign,
      utm_content: utm.utm_content, utm_term: utm.utm_term, referrer: utm.referrer,
      landing_path: utm.landing_path, consentimiento: !!b.consentimiento,
    };
    if (form === 'configurador') {
      rec.tipo_interes = b.uso_proyecto || null; rec.cta = 'configurador';
      rec.uso_proyecto = b.uso_proyecto || null; rec.tipo_terreno = b.tipo_terreno || null;
      rec.requerimientos = b.requerimientos || null; rec.mensaje = b.requerimientos || null;
    } else if (form === 'descarga') {
      rec.tipo_interes = 'descarga'; rec.cta = 'descarga_catalogo'; rec.mensaje = 'Descargo el catalogo tecnico (PDF)';
    } else if (form === 'negocios') {
      rec.tipo_interes = 'comercial'; rec.cta = b.cta || 'negocios';
      rec.modelo = b.modelo || null; rec.uso_comercial = b.uso_comercial || null; rec.unidades = b.unidades || null;
    } else {
      rec.tipo_interes = b.tipo_interes || null; rec.cta = b.cta || 'lead_form';
    }
    return { table: 'leads', rec: rec };
  }

  window.couvaSubmit = function (payload) {
    var x = build(payload);
    return fetch(SB_URL + '/rest/v1/' + x.table, {
      method: 'POST',
      headers: { apikey: SB_ANON, Authorization: 'Bearer ' + SB_ANON, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(x.rec),
    }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return true; });
  };
})();

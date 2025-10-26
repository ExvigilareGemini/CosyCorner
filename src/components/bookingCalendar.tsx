// src/components/BookingCalendar.tsx
import { useEffect, useState } from 'react';

interface EventType {
  id: string;
  name: string;
  duration: string;
  price: string;
  calLink: string;
}

const eventTypes: EventType[] = [
  { 
    id: '2h', 
    name: 'Spa 2 heures', 
    duration: '2h',
    price: '80€',
    calLink: 'cosy-corner-esj1gr/2h' 
  },
  { 
    id: '3h', 
    name: 'Spa 3 heures', 
    duration: '3h',
    price: '140€',
    calLink: 'cosy-corner-esj1gr/3h' 
  },
  { 
    id: '4h', 
    name: 'Spa 4 heures', 
    duration: '4h',
    price: '250€',
    calLink: 'cosy-corner-esj1gr/4h' 
  },
  { 
    id: 'Formule courte', 
    name: 'Formule courte', 
    duration: '1 nuit (20h-9h)',  // ✅ Modifié ici pour plus de clarté
    price: '450€',
    calLink: 'cosy-corner-esj1gr/formule-courte' 
  },
  { 
    id: 'Formule longue', 
    name: 'Formule longue', 
    duration: '1 nuit (17h-10h)',  // ✅ Modifié ici pour plus de clarté
    price: '450€',
    calLink: 'cosy-corner-esj1gr/formule-longue' 
  },
];

export default function BookingCalendar({ theme = 'light' }) {
  const [selectedEvent, setSelectedEvent] = useState<EventType>(eventTypes[0]);

  useEffect(() => {
    // Initialisation Cal.com
    (function (C: any, A: string, L: string) {
      let p = function (a: any, ar: any) { a.q.push(ar); };
      let d = C.document;
      C.Cal = C.Cal || function () {
        let cal = C.Cal;
        let ar = arguments;
        if (!cal.loaded) {
          cal.ns = {};
          cal.q = cal.q || [];
          d.head.appendChild(d.createElement("script")).src = A;
          cal.loaded = true;
        }
        if (ar[0] === L) {
          const api = function () { p(api, arguments); };
          const namespace = ar[1];
          api.q = api.q || [];
          typeof namespace === "string" 
            ? (cal.ns[namespace] = api) && p(api, ar) 
            : p(cal, ar);
          return;
        }
        p(cal, ar);
      };
    })(window, "https://app.cal.com/embed/embed.js", "init");

    // @ts-ignore
    Cal("init", { origin: "https://cal.com" });

  }, []);

  useEffect(() => {
    // Recharger le calendrier quand la sélection change
    const embedElement = document.getElementById("cal-booking-embed");
    if (embedElement) {
      embedElement.innerHTML = ''; // Vider l'ancien calendrier
    }

    // ✅ SOLUTION : Ajouter hideEventTypeDetails pour masquer la durée
    // @ts-ignore
    Cal("inline", {
      elementOrSelector: "#cal-booking-embed",
      calLink: selectedEvent.calLink,
      layout: "month_view",
      config: {
        theme: theme
      }
    });

    // ✅ IMPORTANT : Ajouter la configuration UI pour masquer les détails
    // @ts-ignore
    Cal("ui", {
      hideEventTypeDetails: true,  // 🎯 Masque la durée, description, etc.
      styles: {
        branding: {
          brandColor: "#000000"  // Personnalisez selon vos couleurs
        }
      },
      layout: "month_view"
    });

  }, [selectedEvent, theme]);

  return (
    <div className="booking-wrapper">
      {/* Sélecteur de formule */}
      <div className="event-selector">
        {eventTypes.map((event) => (
          <button
            key={event.id}
            className={`event-card ${selectedEvent.id === event.id ? 'active' : ''}`}
            onClick={() => setSelectedEvent(event)}
          >
            <h3>{event.name}</h3>
            <p className="duration">{event.duration}</p>
            <p className="price">{event.price}</p>
          </button>
        ))}
      </div>

      {/* Calendrier */}
      <div className="booking-container">
        <div id="cal-booking-embed" style={{ width: "100%", height: "100%", overflow: "scroll" }} />
      </div>
    </div>
  );
}
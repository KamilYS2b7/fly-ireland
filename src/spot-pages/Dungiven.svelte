<script lang="ts">
  // Otrzymujesz cały obiekt spot jako prop
  export let spot: {
    name: string;
    lat: number; lon: number;
    sectorStart: number; sectorEnd: number;
    youtube?: string[];
  };
  
  // Funkcja pomocnicza do budowania URL Google Maps
  function getGoogleMapsUrl(lat: number, lon: number) {
    // Poprawiony URL do map Google
    return `http://googleusercontent.com/maps.google.com/7{lat},${lon}&travelmode=driving`;
  }
</script>

<style>
  /* GLOBALNE RESETY I ZASADY */
  .container {
    /* KLUCZ: Maksymalna szerokość ograniczona do 700px,
       żeby pasowało do żądanego rozmiaru okna wtyczki. */
    max-width: 700px; 
    margin: 0 auto;
    padding: 10px; 
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  }
  
  .page {
    /* Zmniejszony odstęp między sekcjami */
    display: grid;
    gap: 12px; 
  }

  /* NAGŁÓWEK W LINII (Nowa sekcja) */
  .inline-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 0;
    border-bottom: 1px solid #e2e8f0;
    margin-bottom: 6px;
  }

  /* TYTUŁ MIEJSCÓWKI (mniejszy i w linii) */
  .spot-title-inline {
    font-size: 20px; 
    font-weight: 700;
    color: #1a202c; 
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  /* SEKCJA METADANYCH I KARTY */
  .grid-section {
    background-color: #f7f7f7; 
    border-radius: 12px; /* Mniejsze zaokrąglenie */
    padding: 10px; /* Zredukowany padding, by zyskać wysokość */
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05); /* Subtelniejszy cień */
  }

  .grid {
    display: grid;
    /* 3 kolumny po 1fr - wymusza układ horyzontalny */
    grid-template-columns: 1fr 1fr 1fr;
    gap: 10px; /* Zmniejszony odstęp między kartami */
  }
  
  /* Karty */
  .card {
    background-color: #ffffff;
    border-radius: 8px; /* Mniejsze zaokrąglenie */
    padding: 12px; /* Zredukowany padding wewnętrzny */
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05); 
    display: grid;
    gap: 8px;
    transition: transform 0.2s ease-out;
  }
  
  .card:hover {
    transform: translateY(-2px); /* Mniejsza animacja */
  }

  .card-title {
    font-size: 13px; /* Zredukowany font */
    font-weight: 600;
    color: #4a5568; 
    padding-bottom: 3px;
    border-bottom: 1px solid #e2e8f0;
  }
  
  .meta div {
    line-height: 1.4;
    color: #4a5568;
    display: flex; 
    gap: 6px;
    align-items: baseline;
    font-size: 12px; /* Zredukowany font */
  }
  
  .meta b {
    color: #1a202c;
    min-width: 60px; /* Mniejsza minimalna szerokość etykiety */
  }

  /* WSKAŹNIK WIATRU (PILL) */
  .pill {
    padding: 3px 8px; /* Mniejszy padding */
    font-size: 11px; /* Zredukowany font */
    background: #48bb78; 
    color: white; 
    border-radius: 999px;
    font-weight: 600;
  }
  
  /* LINKI */
  .link-button {
    padding: 4px 8px; /* Zredukowany przycisk */
    font-size: 12px; /* Zredukowany font */
    background: #007aff; 
    color: white;
    font-weight: 600;
    transition: background 0.2s, transform 0.1s; 
  }
  
  /* SEKCJA YOUTUBE */
  .yt-list {
    display: flex;
    flex-wrap: wrap;
    gap: 4px; /* Zmniejszony odstęp */
  }
  
  .yt-list a {
    padding: 3px 6px; /* Zredukowany link */
    font-size: 12px;
    background: #fef2f2; 
    border: 1px solid #fed7d7;
    color: #e53e3e; 
    font-weight: 500;
  }
  
  /* GŁÓWNA TREŚĆ - Ułożona poziomo obok kart */
  .content-section {
    background-color: #ffffff;
    border-radius: 12px;
    padding: 15px; /* Zredukowany padding */
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
    line-height: 1.5; 
    color: #4a5568;
    font-size: 13px; /* Zredukowany font */
    /* KLUCZ: Wymuszamy aby sekcja opisu była w rzędzie obok głównej sekcji grid-section */
  }
  
  /* Nowy kontener, który wymusza układ horyzontalny */
  .horizontal-layout {
    display: grid;
    /* Dwie kolumny, pierwsza na karty (2fr), druga na opis (1fr) */
    grid-template-columns: 2fr 1fr; 
    gap: 12px;
  }

  /* Adaptacja dla bardzo małych ekranów (gdy wysokość przestaje być problemem) */
  @media (max-width: 600px) {
    .horizontal-layout {
      grid-template-columns: 1fr; /* Powrót do jednej kolumny na wąskim urządzeniu */
    }
  }
</style>

<div class="container"> 
  <div class="page">
    
    <div class="inline-header">
      <div class="spot-title-inline">
        <span style="font-size: 24px;">🪁</span> 
        {spot.name}
      </div>
      <div class="meta">
         <span class="pill">{spot.sectorStart}° – {spot.sectorEnd}°</span>
      </div>
    </div>
    
    <div class="horizontal-layout">
        <div class="grid-section">
            <div class="grid">
                <div class="card meta">
<div class="card-title">Location / Directions</div>
                    <div><b>Lat/Lon:</b> <span>{spot.lat.toFixed(4)}, {spot.lon.toFixed(4)}</span></div>
                    <div>
<b>Maps:</b>
                        <a 
                          class="link-button"
                          target="_blank" rel="noopener"
                          href={getGoogleMapsUrl(spot.lat, spot.lon)}
                        >
                          Open
                        </a>
                    </div>
                </div>

                <div class="card">
<div class="card-title">Videos</div>
                    {#if spot.youtube?.length}
                        <div class="yt-list">
                          {#each spot.youtube as url, i}
                            <a target="_blank" rel="noopener" href={url}>
🎥 Video #{i+1}
                            </a>
                          {/each}
                        </div>
                    {:else}
<div class="meta" style="font-style: italic;">No videos available.</div>
                    {/if}
                </div>
                
                <div class="card">
<div class="card-title">Forecast (Example)</div>
                    <div class="meta">
                        <div><b>Model:</b> <span>ECMWF / GFS</span></div>
                        <div><b>Temp:</b> <span>18°C</span></div>
<div><b>Elevation:</b> <span>350m above sea level</span></div>
                    </div>
                </div>
            </div>
        </div>

        <div class="content-section">
          <p>
Description: **{spot.name}**. Listed wind range: {spot.sectorStart}° to {spot.sectorEnd}°. A broad, grassy slope with a large field at the base. Check local notices and conditions before takeoff!
          </p>
        </div>
    </div>
  </div>
</div>

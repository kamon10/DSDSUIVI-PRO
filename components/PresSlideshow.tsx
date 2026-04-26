
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Play, Pause, Maximize2, Minimize2, Activity, MapPin, Calendar, TrendingUp, Clock, Package, Truck, BarChart3, Download, X } from 'lucide-react';
import { DashboardData, RegionData, SiteRecord, StockRecord, DistributionRecord, GtsRecord } from '../types.ts';
import pptxgen from "pptxgenjs";

interface PresSlideshowProps {
  data: DashboardData;
}

type SlideType = 'COLLECTION' | 'STOCK' | 'DISTRIBUTION' | 'GTS_COMPARISON' | 'FAMILY_HEADER';

interface Slide {
  type: SlideType;
  regionName: string;
  sites: SiteRecord[];
  stock: StockRecord[];
  distributions: DistributionRecord[];
  gts: GtsRecord[];
  familyTitle?: string;
}

const PresSlideshow: React.FC<PresSlideshowProps> = ({ data }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [startDate, setStartDate] = useState(data.date);
  const [endDate, setEndDate] = useState(data.date);

  const parseDate = (dateStr: string) => {
    const [d, m, y] = dateStr.split('/').map(Number);
    return new Date(y, m - 1, d).getTime();
  };

  // Reconstruct slides based on selected period and region data
  const slides = useMemo(() => {
    const regions = data.regions.filter(r => r.sites.length > 0);
    
    const startTs = parseDate(startDate);
    const endTs = parseDate(endDate);
    
    // Filter history for the selected period
    const periodRecords = data.dailyHistory.filter(h => {
      const hTs = parseDate(h.date);
      return hTs >= Math.min(startTs, endTs) && hTs <= Math.max(startTs, endTs);
    });

    // Aggregate site totals for the period
    const periodSiteTotals: Record<string, number> = {};
    periodRecords.forEach(h => {
      h.sites.forEach(s => {
        periodSiteTotals[s.name] = (periodSiteTotals[s.name] || 0) + s.total;
      });
    });
    
    // Calculate monthly totals up to the end date
    const [endDay, endMonth, endYear] = endDate.split('/').map(Number);
    const monthRecords = data.dailyHistory.filter(h => {
      const [hDay, hMonth, hYear] = h.date.split('/').map(Number);
      return hMonth === endMonth && hYear === endYear && hDay <= endDay;
    });

    const monthlyTotals: Record<string, number> = {};
    monthRecords.forEach(h => {
      h.sites.forEach(s => {
        monthlyTotals[s.name] = (monthlyTotals[s.name] || 0) + s.total;
      });
    });

    // Mapping site to region
    const siteToRegion: Record<string, string> = {};
    data.regions.forEach(r => {
      r.sites.forEach(s => {
        siteToRegion[s.name] = r.name;
      });
    });

    const collectionSlides: Slide[] = [];
    const stockSlides: Slide[] = [];
    const distributionSlides: Slide[] = [];
    const gtsSlides: Slide[] = [];

    regions.forEach(region => {
      const regionName = region.name;
      
      const regionSites: SiteRecord[] = [];
      region.sites.forEach(os => {
        regionSites.push({
          ...os,
          totalJour: periodSiteTotals[os.name] || 0,
          totalMois: monthlyTotals[os.name] || 0,
        });
      });

      if (regionSites.length === 0) return;

      const regionStock = (data.stock || []).filter(s => s.pres.toUpperCase() === regionName.toUpperCase());

      const regionDistributions = (data.distributions?.records || []).filter(r => {
        const rTs = parseDate(r.date);
        return r.region.toUpperCase() === regionName.toUpperCase() && 
               rTs >= Math.min(startTs, endTs) && rTs <= Math.max(startTs, endTs);
      });

      const regionGts: GtsRecord[] = [];
      const gtsBySite: Record<string, number> = {};
      
      (data.gts || []).forEach(g => {
        const gTs = parseDate(g.date);
        if (g.region?.toUpperCase() === regionName.toUpperCase() && 
            gTs >= Math.min(startTs, endTs) && gTs <= Math.max(startTs, endTs)) {
          gtsBySite[g.site] = (gtsBySite[g.site] || 0) + g.total;
        }
      });

      Object.entries(gtsBySite).forEach(([site, total]) => {
        regionGts.push({ site, total, date: `${startDate} - ${endDate}`, region: regionName, fixe: 0, mobile: 0, autoTransfusion: 0 });
      });

      collectionSlides.push({ type: 'COLLECTION', regionName, sites: regionSites, stock: [], distributions: [], gts: [] });
      
      if (regionStock.length > 0) {
        stockSlides.push({ type: 'STOCK', regionName, sites: regionSites, stock: regionStock, distributions: [], gts: [] });
      }
      
      if (regionDistributions.length > 0) {
        distributionSlides.push({ type: 'DISTRIBUTION', regionName, sites: regionSites, stock: [], distributions: regionDistributions, gts: [] });
      }

      if (regionGts.length > 0) {
        gtsSlides.push({ type: 'GTS_COMPARISON', regionName, sites: regionSites, stock: [], distributions: [], gts: regionGts });
      }
    });

    const allSlides: Slide[] = [];

    if (collectionSlides.length > 0) {
      allSlides.push({ type: 'FAMILY_HEADER', familyTitle: 'PRELEVEMENT', regionName: '', sites: [], stock: [], distributions: [], gts: [] });
      allSlides.push(...collectionSlides);
    }

    if (stockSlides.length > 0) {
      allSlides.push({ type: 'FAMILY_HEADER', familyTitle: 'STOCK', regionName: '', sites: [], stock: [], distributions: [], gts: [] });
      allSlides.push(...stockSlides);
    }

    if (distributionSlides.length > 0) {
      allSlides.push({ type: 'FAMILY_HEADER', familyTitle: 'DISTRIBUTION', regionName: '', sites: [], stock: [], distributions: [], gts: [] });
      allSlides.push(...distributionSlides);
    }

    if (gtsSlides.length > 0) {
      allSlides.push({ type: 'FAMILY_HEADER', familyTitle: 'COMPARAISON PRELEVEMENT / GTS', regionName: '', sites: [], stock: [], distributions: [], gts: [] });
      allSlides.push(...gtsSlides);
    }

    return allSlides;
  }, [startDate, endDate, data]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [startDate, endDate]);

  useEffect(() => {
    let interval: any;
    if (isAutoPlay) {
      interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % slides.length);
      }, 10000);
    }
    return () => clearInterval(interval);
  }, [isAutoPlay, slides.length]);

  const exportToPPTX = () => {
    const pres = new pptxgen();
    pres.layout = 'LAYOUT_WIDE';
    
    // Define Theme Colors
    const COLORS = {
      ORANGE: 'F97316',
      BLUE: '2563EB',
      GREEN: '10B981',
      ROSE: 'E11D48',
      SLATE_50: 'F8FAFC',
      SLATE_200: 'E2E8F0',
      SLATE_400: '94A3B8',
      SLATE_700: '334155',
      SLATE_900: '0F172A',
      WHITE: 'FFFFFF'
    };

    slides.forEach(slide => {
      const pptSlide = pres.addSlide();
      
      if (slide.type === 'FAMILY_HEADER') {
        pptSlide.background = { color: COLORS.ORANGE };
        
        // Decorative circle
        pptSlide.addShape(pres.ShapeType.ellipse, { 
          x: 5.15, y: 1.5, w: 3, h: 3, 
          fill: { color: COLORS.WHITE, transparency: 80 } 
        });
        
        pptSlide.addText(slide.familyTitle || '', { 
          x: 0, y: 4.5, w: '100%', h: 1, 
          fontSize: 54, bold: true, color: COLORS.WHITE, 
          align: 'center', valign: 'middle' 
        });
        
        // Bottom line
        pptSlide.addShape(pres.ShapeType.rect, { 
          x: 5.65, y: 5.6, w: 2, h: 0.1, 
          fill: { color: COLORS.WHITE } 
        });
        return;
      }

      // Background
      pptSlide.background = { color: COLORS.SLATE_50 };
      
      // Header Bar
      pptSlide.addShape(pres.ShapeType.rect, { 
        x: 0, y: 0, w: '100%', h: 0.6, 
        fill: { color: COLORS.WHITE } 
      });
      pptSlide.addText("HEMO STATS", { 
        x: 0.5, y: 0.15, w: 2, h: 0.3, 
        fontSize: 12, bold: true, color: COLORS.ORANGE 
      });
      pptSlide.addText(startDate === endDate ? startDate : `${startDate} - ${endDate}`, { 
        x: 10.5, y: 0.15, w: 2.5, h: 0.3, 
        fontSize: 10, color: COLORS.SLATE_400, align: 'right' 
      });

      // Slide Title
      pptSlide.addText(slide.regionName, { 
        x: 0.5, y: 0.8, w: '90%', h: 0.6, 
        fontSize: 32, bold: true, color: COLORS.SLATE_900, align: 'center' 
      });
      
      const subTitle = slide.type === 'COLLECTION' ? 'Réalisation Collecte' : 
                      slide.type === 'STOCK' ? 'État des Stocks' : 
                      slide.type === 'DISTRIBUTION' ? 'Distribution PSL' : 'COMPARAISON DECLARATION / GTS';
      
      pptSlide.addText(subTitle, { 
        x: 0.5, y: 1.3, w: '90%', h: 0.4, 
        fontSize: 16, bold: true, color: COLORS.SLATE_400, align: 'center' 
      });

      if (slide.type === 'COLLECTION') {
        const totalJour = slide.sites.reduce((acc, s) => acc + (s.totalJour || 0), 0);
        const totalMois = slide.sites.reduce((acc, s) => acc + (s.totalMois || 0), 0);
        const objMensuel = slide.sites.reduce((acc, s) => acc + (s.objMensuel || 0), 0);

        // Summary Boxes
        pptSlide.addShape(pres.ShapeType.rect, { x: 0.5, y: 1.9, w: 3.8, h: 0.9, fill: { color: 'EFF6FF' }, line: { color: 'DBEAFE', width: 1 } });
        pptSlide.addText(startDate === endDate ? "JOUR" : "PERIODE", { x: 0.6, y: 2.0, w: 3.6, h: 0.2, fontSize: 9, bold: true, color: '2563EB', align: 'center' });
        pptSlide.addText(totalJour.toString(), { x: 0.6, y: 2.2, w: 3.6, h: 0.4, fontSize: 22, bold: true, color: '1E40AF', align: 'center' });

        pptSlide.addShape(pres.ShapeType.rect, { x: 4.75, y: 1.9, w: 3.8, h: 0.9, fill: { color: 'FFF7ED' }, line: { color: 'FFEDD5', width: 1 } });
        pptSlide.addText("MOIS", { x: 4.85, y: 2.0, w: 3.6, h: 0.2, fontSize: 9, bold: true, color: 'EA580C', align: 'center' });
        pptSlide.addText(totalMois.toString(), { x: 4.85, y: 2.2, w: 3.6, h: 0.4, fontSize: 22, bold: true, color: '9A3412', align: 'center' });

        pptSlide.addShape(pres.ShapeType.rect, { x: 9, y: 1.9, w: 3.8, h: 0.9, fill: { color: 'F0FDF4' }, line: { color: 'DCFCE7', width: 1 } });
        pptSlide.addText("OBJECTIF", { x: 9.1, y: 2.0, w: 3.6, h: 0.2, fontSize: 9, bold: true, color: '16A34A', align: 'center' });
        pptSlide.addText(objMensuel.toString(), { x: 9.1, y: 2.2, w: 3.6, h: 0.4, fontSize: 22, bold: true, color: '166534', align: 'center' });

        const rows = [
          [
            { text: 'Site', options: { fill: { color: 'F1F5F9' }, bold: true, color: '475569' } },
            { text: startDate === endDate ? 'Jour' : 'Période', options: { fill: { color: 'F1F5F9' }, bold: true, color: '475569', align: 'center' } },
            { text: 'Mois', options: { fill: { color: 'F1F5F9' }, bold: true, color: '475569', align: 'center' } },
            { text: 'Objectif', options: { fill: { color: 'F1F5F9' }, bold: true, color: '475569', align: 'center' } },
            { text: '%', options: { fill: { color: 'F1F5F9' }, bold: true, color: '475569', align: 'center' } }
          ]
        ];
        
        slide.sites.forEach(s => {
          const percent = Math.round((s.totalMois / (s.objMensuel || 1)) * 100);
          rows.push([
            { text: s.name, options: { bold: true, color: '334155' } },
            { text: s.totalJour.toString(), options: { align: 'center', color: '2563EB', bold: true } },
            { text: s.totalMois.toString(), options: { align: 'center', color: 'EA580C', bold: true } },
            { text: s.objMensuel.toString(), options: { align: 'center', color: '64748B' } },
            { text: percent + '%', options: { align: 'center', bold: true, color: percent >= 100 ? '16A34A' : '334155' } }
          ] as any);
        });
        
        pptSlide.addTable(rows as any, { 
          x: 0.5, y: 3.0, w: 12.3, 
          colW: [4, 2, 2, 2, 2.3], 
          border: { pt: 1, color: 'E2E8F0' }, 
          fontSize: 11,
          fill: { color: 'FFFFFF' }
        });
      } else if (slide.type === 'STOCK') {
        const totalStock = slide.stock.reduce((acc, s) => acc + s.quantite, 0);
        const totalCgr = slide.stock.filter(s => (s.typeProduit || "").toUpperCase().includes('CGR')).reduce((acc, s) => acc + s.quantite, 0);
        
        pptSlide.addShape(pres.ShapeType.rect, { x: 0.5, y: 1.9, w: 6.0, h: 0.8, fill: { color: 'EEF2FF' }, line: { color: 'E0E7FF', width: 1 } });
        pptSlide.addText("TOTAL STOCK SUR LA PERIODE", { x: 0.6, y: 2.0, w: 5.8, h: 0.2, fontSize: 9, bold: true, color: '4F46E5', align: 'center' });
        pptSlide.addText(totalStock.toString() + " POCHES", { x: 0.6, y: 2.2, w: 5.8, h: 0.4, fontSize: 20, bold: true, color: '3730A3', align: 'center' });

        pptSlide.addShape(pres.ShapeType.rect, { x: 6.8, y: 1.9, w: 6.0, h: 0.8, fill: { color: 'FFF1F2' }, line: { color: 'FFE4E6', width: 1 } });
        pptSlide.addText("TOTAL CGR SUR LA PERIODE", { x: 6.9, y: 2.0, w: 5.8, h: 0.2, fontSize: 9, bold: true, color: 'E11D48', align: 'center' });
        pptSlide.addText(totalCgr.toString() + " POCHES", { x: 6.9, y: 2.2, w: 5.8, h: 0.4, fontSize: 20, bold: true, color: '9F1239', align: 'center' });

        const groups = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
        const rows = [[{ text: 'Groupe', options: { fill: { color: 'F1F5F9' }, bold: true } }, { text: 'Quantité', options: { fill: { color: 'F1F5F9' }, bold: true, align: 'center' } }]];
        
        groups.forEach(group => {
          const qty = slide.stock.filter(s => s.groupeSanguin === group).reduce((acc, s) => acc + s.quantite, 0);
          rows.push([
            { text: group, options: { bold: true, color: COLORS.ROSE } },
            { text: qty.toString(), options: { align: 'center', bold: true } }
          ] as any);
        });
        
        pptSlide.addTable(rows as any, { 
          x: 0.5, y: 3.0, w: 5.8, 
          border: { pt: 1, color: 'E2E8F0' }, 
          fontSize: 12,
          fill: { color: 'FFFFFF' }
        });

        // Product types
        const types = Array.from(new Set(slide.stock.map(s => s.typeProduit)));
        const typeRows = [[{ text: 'Type de Produit', options: { fill: { color: 'F1F5F9' }, bold: true } }, { text: 'Quantité', options: { fill: { color: 'F1F5F9' }, bold: true, align: 'center' } }]];
        
        types.forEach(type => {
          const qty = slide.stock.filter(s => s.typeProduit === type).reduce((acc, s) => acc + s.quantite, 0);
          typeRows.push([
            { text: type, options: { bold: true } },
            { text: qty.toString(), options: { align: 'center', bold: true, color: '4F46E5' } }
          ] as any);
        });

        pptSlide.addTable(typeRows as any, { 
          x: 7.0, y: 3.0, w: 5.8, 
          border: { pt: 1, color: 'E2E8F0' }, 
          fontSize: 12,
          fill: { color: 'FFFFFF' }
        });

        // Site Detail Table
        const siteRows = [
          [
            { text: 'Site', options: { fill: { color: 'F1F5F9' }, bold: true, color: '475569' } },
            ...groups.map(g => ({ text: g, options: { fill: { color: 'F1F5F9' }, bold: true, color: '475569', align: 'center' } })),
            { text: 'Total', options: { fill: { color: 'F1F5F9' }, bold: true, color: '475569', align: 'right' } }
          ]
        ];

        slide.sites.sort((a, b) => a.name.localeCompare(b.name)).forEach(site => {
          const siteStock = slide.stock.filter(s => 
            s.site && site.name && s.site.trim().toUpperCase() === site.name.trim().toUpperCase()
          );
          const total = siteStock.reduce((acc, s) => acc + s.quantite, 0);
          siteRows.push([
            { text: site.name, options: { bold: true } },
            ...groups.map(group => {
              const qty = siteStock.filter(s => s.groupeSanguin === group).reduce((acc, s) => acc + s.quantite, 0);
              return { text: qty || '-', options: { align: 'center' } };
            }),
            { text: total.toString(), options: { align: 'right', bold: true, color: '2563EB' } }
          ] as any);
        });

        pptSlide.addTable(siteRows as any, { 
          x: 0.5, y: 5.5, w: 12.3, 
          border: { pt: 1, color: 'E2E8F0' }, 
          fontSize: 9,
          fill: { color: 'FFFFFF' }
        });
      } else if (slide.type === 'DISTRIBUTION') {
        const groups = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
        groups.forEach((group, idx) => {
          const qty = slide.distributions.filter(d => d.groupeSanguin === group).reduce((acc, d) => acc + d.quantite, 0);
          const xPos = 0.5 + (idx % 4) * 3.15;
          const yPos = 2.2 + Math.floor(idx / 4) * 1.8;
          
          pptSlide.addShape(pres.ShapeType.rect, { 
            x: xPos, y: yPos, w: 2.8, h: 1.5, 
            fill: { color: COLORS.WHITE }, 
            line: { color: COLORS.SLATE_200, width: 1 } 
          });
          
          pptSlide.addText(group, { 
            x: xPos, y: yPos + 0.2, w: 2.8, h: 0.4, 
            fontSize: 24, bold: true, color: COLORS.ROSE, align: 'center' 
          });
          pptSlide.addText(qty.toString(), { 
            x: xPos, y: yPos + 0.6, w: 2.8, h: 0.5, 
            fontSize: 32, bold: true, color: COLORS.SLATE_900, align: 'center' 
          });
          pptSlide.addText("Poches", { 
            x: xPos, y: yPos + 1.1, w: 2.8, h: 0.2, 
            fontSize: 10, bold: true, color: COLORS.SLATE_400, align: 'center' 
          });
        });
      } else if (slide.type === 'GTS_COMPARISON') {
        const totalDecl = slide.sites.reduce((acc, s) => acc + (s.totalJour || 0), 0);
        const totalGts = slide.gts.reduce((acc, g) => acc + g.total, 0);
        const totalDiff = totalDecl - totalGts;

        // Summary Boxes
        pptSlide.addShape(pres.ShapeType.rect, { x: 0.5, y: 1.9, w: 3.8, h: 0.9, fill: { color: 'FFF7ED' }, line: { color: 'FFEDD5', width: 1 } });
        pptSlide.addText("DECLARATION", { x: 0.6, y: 2.0, w: 3.6, h: 0.2, fontSize: 9, bold: true, color: 'EA580C', align: 'center' });
        pptSlide.addText(totalDecl.toString(), { x: 0.6, y: 2.2, w: 3.6, h: 0.4, fontSize: 22, bold: true, color: '9A3412', align: 'center' });

        pptSlide.addShape(pres.ShapeType.rect, { x: 4.75, y: 1.9, w: 3.8, h: 0.9, fill: { color: 'EFF6FF' }, line: { color: 'DBEAFE', width: 1 } });
        pptSlide.addText("ENCODAGE GTS", { x: 4.85, y: 2.0, w: 3.6, h: 0.2, fontSize: 9, bold: true, color: '2563EB', align: 'center' });
        pptSlide.addText(totalGts.toString(), { x: 4.85, y: 2.2, w: 3.6, h: 0.4, fontSize: 22, bold: true, color: '1E40AF', align: 'center' });

        pptSlide.addShape(pres.ShapeType.rect, { x: 9, y: 1.9, w: 3.8, h: 0.9, fill: { color: 'F0FDF4' }, line: { color: 'DCFCE7', width: 1 } });
        pptSlide.addText("ECART", { x: 9.1, y: 2.0, w: 3.6, h: 0.2, fontSize: 9, bold: true, color: '16A34A', align: 'center' });
        pptSlide.addText((totalDiff > 0 ? '+' : '') + totalDiff.toString(), { x: 9.1, y: 2.2, w: 3.6, h: 0.4, fontSize: 22, bold: true, color: totalDiff >= 0 ? '166534' : '991B1B', align: 'center' });

        const rows = [
          [
            { text: 'Site', options: { fill: { color: 'F1F5F9' }, bold: true, color: '475569' } },
            { text: 'DECLARATION', options: { fill: { color: 'F1F5F9' }, bold: true, color: '475569', align: 'center' } },
            { text: 'ENCODAGE GTS', options: { fill: { color: 'F1F5F9' }, bold: true, color: '475569', align: 'center' } },
            { text: 'Écart', options: { fill: { color: 'F1F5F9' }, bold: true, color: '475569', align: 'center' } }
          ]
        ];
        
        slide.sites.forEach(s => {
          const gtsMatch = slide.gts.find(g => g.site.toUpperCase() === s.name.toUpperCase());
          const gtsTotal = gtsMatch ? gtsMatch.total : 0;
          const diff = s.totalJour - gtsTotal;
          
          rows.push([
            { text: s.name, options: { bold: true } },
            { text: s.totalJour.toString(), options: { align: 'center', bold: true } },
            { text: gtsTotal.toString(), options: { align: 'center', bold: true, color: '2563EB' } },
            { text: (diff > 0 ? '+' : '') + diff.toString(), options: { align: 'center', bold: true, color: diff >= 0 ? '16A34A' : 'E11D48' } }
          ] as any);
        });
        
        pptSlide.addTable(rows as any, { 
          x: 0.5, y: 3.0, w: 12.3, 
          colW: [4, 3, 3, 2.3], 
          border: { pt: 1, color: 'E2E8F0' }, 
          fontSize: 11,
          fill: { color: 'FFFFFF' }
        });
      }
    });

    pres.writeFile({ fileName: `Presentation_HEMO_STATS_${startDate.replace(/\//g, '-')}_${endDate.replace(/\//g, '-')}.pptx` });
  };

  if (slides.length === 0) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-slate-500 font-medium">
        Aucune donnée disponible pour cette période.
      </div>
    );
  }

  const currentSlide = slides[currentIndex];

  const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  return (
    <div className={`relative flex flex-col ${isFullscreen ? 'fixed inset-0 z-[200] bg-slate-900 p-8' : 'w-full max-w-7xl mx-auto p-4 h-[calc(100vh-140px)] min-h-[700px]'}`}>
      {/* Header Controls */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-500 rounded-lg shadow-lg shadow-orange-500/20">
            <Activity className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
              Présentation par PRES
            </h2>
            <p className="text-sm text-slate-500 font-medium">
              Slide {currentIndex + 1} sur {slides.length}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={exportToPPTX}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all font-bold text-xs uppercase"
          >
            <Download size={16} />
            PPTX
          </button>

          {/* Period Selector */}
          <div className="flex items-center gap-4 px-4 py-2 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase">Du</span>
              <select 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-[10px] font-black uppercase outline-none cursor-pointer bg-transparent"
              >
                <option value={data.date}>{data.date}</option>
                {data.dailyHistory.filter(h => h.date !== data.date).map(h => (
                  <option key={h.date} value={h.date}>{h.date}</option>
                ))}
              </select>
            </div>
            <div className="w-px h-4 bg-slate-200" />
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase">Au</span>
              <select 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-[10px] font-black uppercase outline-none cursor-pointer bg-transparent"
              >
                <option value={data.date}>{data.date}</option>
                {data.dailyHistory.filter(h => h.date !== data.date).map(h => (
                  <option key={h.date} value={h.date}>{h.date}</option>
                ))}
              </select>
            </div>
          </div>

          <button 
            onClick={() => setIsAutoPlay(!isAutoPlay)}
            className={`p-3 rounded-xl transition-all ${isAutoPlay ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
          >
            {isAutoPlay ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <button 
            onClick={toggleFullscreen}
            className="p-3 bg-white text-slate-600 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all"
          >
            {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>
        </div>
      </div>

      {/* Slide Content */}
      <div className="relative flex-1 min-h-[600px] overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide.type === 'FAMILY_HEADER' ? `header-${currentSlide.familyTitle}` : `${currentSlide.regionName}-${currentSlide.type}`}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`absolute inset-0 p-8 flex flex-col ${currentSlide.type === 'FAMILY_HEADER' ? 'bg-orange-500 items-center justify-center text-white' : ''}`}
          >
            {currentSlide.type === 'FAMILY_HEADER' ? (
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-8 mx-auto"
                >
                  <Activity size={48} className="text-white" />
                </motion.div>
                <motion.h1 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-7xl font-black uppercase tracking-tighter mb-4"
                >
                  {currentSlide.familyTitle}
                </motion.h1>
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: 200 }}
                  transition={{ delay: 0.6, duration: 0.8 }}
                  className="h-2 bg-white rounded-full mx-auto"
                />
              </div>
            ) : (
              <>
                {/* Region Title */}
                <div className="mb-6 text-center">
                  <motion.h3 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-5xl font-black text-slate-900 uppercase tracking-tight mb-2"
                  >
                    {currentSlide.regionName}
                  </motion.h3>
                  <div className="flex items-center justify-center gap-3">
                    <div className="h-1.5 w-12 bg-orange-500 rounded-full" />
                    <span className="text-lg font-bold text-slate-400 uppercase tracking-widest">
                      {currentSlide.type === 'COLLECTION' ? 'Réalisation Collecte' : 
                       currentSlide.type === 'STOCK' ? 'État des Stocks' : 
                       currentSlide.type === 'DISTRIBUTION' ? 'Distribution PSL' : 'COMPARAISON DECLARATION / GTS'}
                    </span>
                    <div className="h-1.5 w-12 bg-orange-500 rounded-full" />
                  </div>
                </div>

                {currentSlide.type === 'COLLECTION' && (
                  <>
                    {/* Region Summary Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                      <StatBox 
                        label={startDate === endDate ? "Total Jour" : "Total Période"} 
                        value={currentSlide.sites.reduce((acc, s) => acc + (s.totalJour || 0), 0)} 
                        icon={<Calendar className="text-blue-500" />}
                        color="blue"
                      />
                      <StatBox 
                        label="Total Mois" 
                        value={currentSlide.sites.reduce((acc, s) => acc + (s.totalMois || 0), 0)} 
                        icon={<Activity className="text-orange-500" />}
                        color="orange"
                      />
                      <StatBox 
                        label="Objectif Mensuel" 
                        value={currentSlide.sites.reduce((acc, s) => acc + (s.objMensuel || 0), 0)} 
                        icon={<TrendingUp className="text-green-500" />}
                        color="green"
                      />
                    </div>

                    {/* Sites Table */}
                    <div className="flex-1 overflow-hidden flex flex-col">
                      <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <MapPin size={20} className="text-slate-400" />
                        Détail par Site
                      </h4>
                      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        <table className="w-full border-collapse">
                          <thead className="sticky top-0 bg-white z-10">
                            <tr className="text-left">
                              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">Site</th>
                              <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">{startDate === endDate ? "Jour" : "Période"}</th>
                              <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">Mois</th>
                              <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">Objectif</th>
                              <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">Réalisation</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {currentSlide.sites.sort((a, b) => (b.totalMois || 0) - (a.totalMois || 0)).map((site, idx) => (
                              <motion.tr 
                                key={site.name}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="group hover:bg-slate-50/80 transition-colors"
                              >
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-1.5 h-6 bg-orange-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <span className="font-bold text-slate-700">{site.name}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-center font-mono font-bold text-blue-600">
                                  {site.totalJour || 0}
                                </td>
                                <td className="px-6 py-4 text-center font-mono font-bold text-orange-600">
                                  {site.totalMois || 0}
                                </td>
                                <td className="px-6 py-4 text-center font-mono text-slate-400">
                                  {site.objMensuel || 0}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end gap-4">
                                    <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                      <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(100, ((site.totalMois || 0) / (site.objMensuel || 1)) * 100)}%` }}
                                        className="h-full bg-orange-500" 
                                      />
                                    </div>
                                    <span className="text-xs font-black text-slate-900 w-10">
                                      {Math.round(((site.totalMois || 0) / (site.objMensuel || 1)) * 100)}%
                                    </span>
                                  </div>
                                </td>
                              </motion.tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}

                {currentSlide.type === 'STOCK' && (
                  <div className="flex-1 flex flex-col">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                      <StatBox 
                        label="Total Stock" 
                        value={currentSlide.stock.reduce((acc, s) => acc + s.quantite, 0)} 
                        icon={<Package className="text-purple-500" />}
                        color="blue"
                      />
                      <StatBox 
                        label="Total CGR" 
                        value={currentSlide.stock.filter(s => (s.typeProduit || "").toUpperCase().includes('CGR')).reduce((acc, s) => acc + s.quantite, 0)} 
                        icon={<Activity className="text-rose-500" />}
                        color="green"
                      />
                      <StatBox 
                        label="Groupes Différents" 
                        value={new Set(currentSlide.stock.map(s => s.groupeSanguin)).size} 
                        icon={<Activity className="text-orange-500" />}
                        color="orange"
                      />
                    </div>
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        {/* Stock by Product Type */}
                        <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
                          <h5 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Par Type de Produit</h5>
                          <div className="space-y-4">
                            {Array.from(new Set(currentSlide.stock.map(s => s.typeProduit))).map(type => {
                              const qty = currentSlide.stock.filter(s => s.typeProduit === type).reduce((acc, s) => acc + s.quantite, 0);
                              const total = currentSlide.stock.reduce((acc, s) => acc + s.quantite, 0);
                              return (
                                <div key={type} className="flex flex-col gap-2">
                                  <div className="flex justify-between items-end">
                                    <span className="text-sm font-bold text-slate-700">{type}</span>
                                    <span className="text-sm font-black text-slate-900">{qty}</span>
                                  </div>
                                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500" style={{ width: `${(qty / total) * 100}%` }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        {/* Stock by Group */}
                        <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
                          <h5 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Par Groupe Sanguin</h5>
                          <div className="grid grid-cols-4 gap-4">
                            {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(group => {
                              const qty = currentSlide.stock.filter(s => s.groupeSanguin === group).reduce((acc, s) => acc + s.quantite, 0);
                              return (
                                <div key={group} className="flex flex-col items-center">
                                  <span className="text-xs font-black text-rose-600">{group}</span>
                                  <span className="text-lg font-black text-slate-900">{qty}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Stock by Site Table */}
                      <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          Détail par Site
                        </h5>
                        <table className="w-full border-collapse">
                          <thead className="sticky top-0 bg-white z-10">
                            <tr className="text-left">
                              <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">Site</th>
                              {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(g => (
                                <th key={g} className="px-2 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">{g}</th>
                              ))}
                              <th className="px-4 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {currentSlide.sites.sort((a, b) => a.name.localeCompare(b.name)).map(site => {
                              const siteStock = currentSlide.stock.filter(s => 
                                s.site && site.name && s.site.trim().toUpperCase() === site.name.trim().toUpperCase()
                              );
                              const total = siteStock.reduce((acc, s) => acc + s.quantite, 0);
                              return (
                                <tr key={site.name} className="group hover:bg-slate-50/80 transition-colors">
                                  <td className="px-4 py-4">
                                    <div className="flex items-center gap-2">
                                      <div className="w-1 h-4 bg-indigo-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                      <span className="font-bold text-slate-700 text-sm">{site.name}</span>
                                    </div>
                                  </td>
                                  {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(group => {
                                    const qty = siteStock.filter(s => s.groupeSanguin === group).reduce((acc, s) => acc + s.quantite, 0);
                                    return (
                                      <td key={group} className={`px-2 py-4 text-center text-xs font-mono font-bold ${qty > 0 ? 'text-slate-900' : 'text-slate-200'}`}>
                                        {qty || '-'}
                                      </td>
                                    );
                                  })}
                                  <td className="px-4 py-4 text-right font-mono font-black text-indigo-600 text-sm">
                                    {total}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {currentSlide.type === 'DISTRIBUTION' && (
                  <div className="flex-1 flex flex-col">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
                      <StatBox 
                        label="Total Distribué" 
                        value={currentSlide.distributions.reduce((acc, d) => acc + d.quantite, 0)} 
                        icon={<Truck className="text-indigo-500" />}
                        color="blue"
                      />
                      <StatBox 
                        label="Rendus / Périmés" 
                        value={currentSlide.distributions.reduce((acc, d) => acc + (d.rendu || 0), 0)} 
                        icon={<X className="text-rose-500" />}
                        color="orange"
                      />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
                      {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(group => {
                        const qty = currentSlide.distributions.filter(d => d.groupeSanguin === group).reduce((acc, d) => acc + d.quantite, 0);
                        return (
                          <div key={group} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col items-center justify-center text-center">
                            <span className="text-2xl font-black text-rose-600 mb-1">{group}</span>
                            <span className="text-3xl font-black text-slate-900">{qty}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase mt-2">Poches</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {currentSlide.type === 'GTS_COMPARISON' && (
                  <div className="flex-1 flex flex-col">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                      <StatBox 
                        label={startDate === endDate ? "DECLARATION" : "DECLARATION PERIODE"} 
                        value={currentSlide.sites.reduce((acc, s) => acc + (s.totalJour || 0), 0)} 
                        icon={<Activity className="text-orange-500" />}
                        color="orange"
                      />
                      <StatBox 
                        label={startDate === endDate ? "ENCODAGE GTS" : "ENCODAGE GTS PERIODE"} 
                        value={currentSlide.gts.reduce((acc, g) => acc + g.total, 0)} 
                        icon={<BarChart3 className="text-blue-500" />}
                        color="blue"
                      />
                      <StatBox 
                        label="Écart Global" 
                        value={currentSlide.sites.reduce((acc, s) => acc + (s.totalJour || 0), 0) - currentSlide.gts.reduce((acc, g) => acc + g.total, 0)} 
                        icon={<TrendingUp className="text-emerald-500" />}
                        color="green"
                      />
                    </div>
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                      <table className="w-full border-collapse">
                        <thead className="sticky top-0 bg-white z-10">
                          <tr className="text-left">
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">Site</th>
                            <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">{startDate === endDate ? "DECLARATION" : "DECLARATION PERIODE"}</th>
                            <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">{startDate === endDate ? "ENCODAGE GTS" : "ENCODAGE GTS PERIODE"}</th>
                            <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">Écart</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {currentSlide.sites.map((site, idx) => {
                            const gtsMatch = currentSlide.gts.find(g => g.site.toUpperCase() === site.name.toUpperCase());
                            const gtsTotal = gtsMatch ? gtsMatch.total : 0;
                            const diff = site.totalJour - gtsTotal;
                            return (
                              <tr key={site.name} className="group hover:bg-slate-50/80 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-1.5 h-6 bg-orange-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <span className="font-bold text-slate-700">{site.name}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-center font-mono font-bold text-slate-900">{site.totalJour}</td>
                                <td className="px-6 py-4 text-center font-mono font-bold text-blue-600">{gtsTotal}</td>
                                <td className={`px-6 py-4 text-right font-mono font-black ${diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {diff > 0 ? '+' : ''}{diff}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows */}
        <button 
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-4 bg-white/80 backdrop-blur-md text-slate-800 rounded-full shadow-xl hover:bg-white transition-all z-10 border border-slate-100"
        >
          <ChevronLeft size={32} />
        </button>
        <button 
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-4 bg-white/80 backdrop-blur-md text-slate-800 rounded-full shadow-xl hover:bg-white transition-all z-10 border border-slate-100"
        >
          <ChevronRight size={32} />
        </button>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-100">
          <motion.div 
            className="h-full bg-orange-500"
            initial={{ width: 0 }}
            animate={{ width: `${((currentIndex + 1) / slides.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Indicators */}
      <div className="flex justify-center gap-2 mt-8">
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`h-2 rounded-full transition-all ${idx === currentIndex ? 'w-8 bg-orange-500' : 'w-2 bg-slate-300 hover:bg-slate-400'}`}
          />
        ))}
      </div>
    </div>
  );
};

const StatBox = ({ label, value, icon, color }: { label: string, value: number, icon: React.ReactNode, color: string }) => {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
    green: 'bg-green-50 text-green-600 border-green-100'
  };

  return (
    <div className={`p-6 rounded-3xl border ${colorClasses[color]} flex items-center gap-5 shadow-sm`}>
      <div className="p-4 bg-white rounded-2xl shadow-sm">
        {icon}
      </div>
      <div>
        <p className="text-sm font-bold opacity-70 uppercase tracking-wider">{label}</p>
        <p className="text-3xl font-black">{value.toLocaleString()}</p>
      </div>
    </div>
  );
};

export default PresSlideshow;

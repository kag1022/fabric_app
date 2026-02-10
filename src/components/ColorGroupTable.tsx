import React, { useState } from 'react';
import {
  Box, Typography, Accordion, AccordionSummary, AccordionDetails,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Grid,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { HUE_CATEGORIES } from '../utils/colorUtils';

const VALUE_CATEGORIES: { [key: number]: string } = {
  1: '暗',
  2: '中',
  3: '明',
};

// 各色相カテゴリに対応する代表的な色 (表示用のカラードット)
const HUE_COLORS: { [key: number]: string } = {
  0: '#888888', // 無彩色
  1: '#ef4444', // 赤
  2: '#f97316', // オレンジ
  3: '#eab308', // 黄
  4: '#22c55e', // 緑
  5: '#06b6d4', // シアン
  6: '#3b82f6', // 青
  7: '#8b5cf6', // 紫
  8: '#ec4899', // マゼンタ
};

const ColorGroupTable: React.FC = () => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Box sx={{ mt: 3, mb: 2, width: '100%', maxWidth: 600 }}>
      <Accordion
        expanded={expanded}
        onChange={() => setExpanded(!expanded)}
        sx={{
          background: 'rgba(30, 30, 50, 0.4)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '12px !important',
          '&::before': { display: 'none' },
          '&.Mui-expanded': { margin: 0 },
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon sx={{ color: 'text.secondary' }} />}
          sx={{
            borderRadius: 3,
            '&:hover': { background: 'rgba(165, 180, 252, 0.04)' },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InfoOutlinedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              色の分類グループについて
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0, px: 2, pb: 2 }}>
          <Grid container spacing={2}>
            {/* 色相テーブル */}
            <Grid item xs={12} sm={6}>
              <TableContainer component={Paper} sx={{
                background: 'rgba(15, 15, 26, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.04)',
              }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        color: '#a5b4fc',
                        borderBottom: '1px solid rgba(165, 180, 252, 0.15)',
                      }}>
                        色相
                      </TableCell>
                      <TableCell align="right" sx={{
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        color: '#a5b4fc',
                        borderBottom: '1px solid rgba(165, 180, 252, 0.15)',
                      }}>
                        プレフィックス
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(HUE_CATEGORIES).map(([category, name]) => (
                      <TableRow key={category} sx={{
                        '&:last-child td': { borderBottom: 0 },
                        '& td': { borderBottom: '1px solid rgba(255, 255, 255, 0.04)' },
                      }}>
                        <TableCell component="th" scope="row" sx={{ py: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              backgroundColor: HUE_COLORS[Number(category)],
                              boxShadow: `0 0 6px ${HUE_COLORS[Number(category)]}80`,
                              flexShrink: 0,
                            }} />
                            <Typography variant="body2">{name}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                            C{category}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>

            {/* 明度テーブル */}
            <Grid item xs={12} sm={6}>
              <TableContainer component={Paper} sx={{
                background: 'rgba(15, 15, 26, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.04)',
              }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        color: '#c084fc',
                        borderBottom: '1px solid rgba(192, 132, 252, 0.15)',
                      }}>
                        明度
                      </TableCell>
                      <TableCell align="right" sx={{
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        color: '#c084fc',
                        borderBottom: '1px solid rgba(192, 132, 252, 0.15)',
                      }}>
                        サフィックス
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(VALUE_CATEGORIES).map(([category, name]) => (
                      <TableRow key={category} sx={{
                        '&:last-child td': { borderBottom: 0 },
                        '& td': { borderBottom: '1px solid rgba(255, 255, 255, 0.04)' },
                      }}>
                        <TableCell component="th" scope="row" sx={{ py: 1 }}>
                          <Typography variant="body2">{name}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                            {category}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default ColorGroupTable;
import React from 'react';
import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Grid } from '@mui/material';
import { HUE_CATEGORIES } from '../utils/colorUtils';

const VALUE_CATEGORIES: { [key: number]: string } = {
    1: '暗',
    2: '中',
    3: '明',
};

const ColorGroupTable: React.FC = () => {
    return (
        <Box sx={{ mt: 4, mb: 2, maxWidth: 600, width: '100%' }}>
            <Typography variant="h6" gutterBottom>
                色の分類グループ
            </Typography>
            <Grid container spacing={2}>
                <Grid item xs={6}>
                    <TableContainer component={Paper}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>色相</TableCell>
                                    <TableCell align="right">グループプレフィックス</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {Object.entries(HUE_CATEGORIES).map(([category, name]) => (
                                    <TableRow key={category}>
                                        <TableCell component="th" scope="row">
                                            {name}
                                        </TableCell>
                                        <TableCell align="right">C{category}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Grid>
                <Grid item xs={6}>
                    <TableContainer component={Paper}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>明度</TableCell>
                                    <TableCell align="right">グループサフィックス</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {Object.entries(VALUE_CATEGORIES).map(([category, name]) => (
                                    <TableRow key={category}>
                                        <TableCell component="th" scope="row">
                                            {name}
                                        </TableCell>
                                        <TableCell align="right">{category}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Grid>
            </Grid>
        </Box>
    );
};

export default ColorGroupTable;
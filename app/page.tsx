"use client"
import * as React from "react"
import { 
  Autocomplete, TextField, Container, Box, Typography, Grid,
  Card, CardContent, IconButton, Paper, Button, CircularProgress
} from "@mui/material"
import DeleteIcon from '@mui/icons-material/Delete';
import CalculateIcon from '@mui/icons-material/Calculate';
import { useAws } from "@/hooks/useAws"
import { Attributes, LambdaOptions, AmplifyOptions, AppSyncOptions } from "@/utilities/attributes"
import type { AttributeName } from "@/utilities/attributes"

interface Option {
  label: string;
  value: string;
}

interface ServiceCard {
  id: string;
  service: string;
  attributes: {[key: string]: string};
  price?: number;
  actualCost?: {
    lastMonth: string;
    currency: string;
  };
}

interface SpecOptions {
  [key: string]: Array<Option>;
}

export default function Page() {
  const { services, servicesLoading, specsLoading, costLoading, fetchServices, fetchServiceSpecs, fetchServiceCost } = useAws()
  const [serviceCards, setServiceCards] = React.useState<ServiceCard[]>([])
  const [selectedServices, setSelectedServices] = React.useState<string[]>([])
  const [totalCost, setTotalCost] = React.useState<number>(0)
  const [specOptions, setSpecOptions] = React.useState<SpecOptions>({})

  React.useEffect(() => { 
    fetchServices();
  }, [fetchServices]);

  React.useEffect(() => {
    // 合計金額の計算
    const total = serviceCards.reduce((sum, card) => sum + (card.price || 0), 0)
    setTotalCost(total)
  }, [serviceCards])

  const handleServiceAdd = (_event: React.SyntheticEvent, newValues: string[]) => {
    setSelectedServices(newValues)  // 選択状態を更新
    // fetchServiceAttributes(newValues[0])  // 属性を取得

    // 既存のサービスを取得
    const existingServices = serviceCards.map(card => card.service);
    
    // 新しく追加されたサービスを特定
    const addedServices = newValues.filter(service => !existingServices.includes(service));
    // 削除されたサービスを特定
    const removedServices = existingServices.filter(service => !newValues.includes(service));

    // 削除されたサービスのカードを削除
    setServiceCards(prev => prev.filter(card => !removedServices.includes(card.service)));

    // 新しいサービスのカードを追加
    for (const service of addedServices) {
      const newCard: ServiceCard = {
        id: Math.random().toString(36).substr(2, 9),
        service: service,
        attributes: {}
      };

      setServiceCards(prev => [...prev, newCard]);

      // スペックオプションを取得
      const fetchSpecs = async () => {
        const newSpecs: SpecOptions = {};
        for (const attribute of Attributes[service as AttributeName] || []) {
          newSpecs[`${newCard.id}-${attribute}`] = await fetchServiceSpecs(service, attribute);
        }
        setSpecOptions(prev => ({...prev, ...newSpecs}));
      };
      fetchSpecs();
    }
  };

  const handleAttributeChange = async (cardId: string, attribute: string, value: string) => {
    setServiceCards(prev => prev.map(card => {
      if (card.id === cardId) {
        const newAttributes = { ...card.attributes, [attribute]: value }
        card.attributes = newAttributes

        // 属性が全て選択されたら価格を取得
        if (Attributes[card.service as AttributeName].every(attr => newAttributes[attr])) {
          fetchServiceCost(card.service, newAttributes).then(data => {
            setServiceCards(cards => cards.map(c => 
              c.id === cardId ? { ...c, price: data.price, actualCost: data.actualCost } : c
            ))
          })
        }
      }
      return card
    }))
  }

  const handleDeleteCard = (cardId: string) => {
    // 削除するカードのサービス名を取得
    const cardToDelete = serviceCards.find(card => card.id === cardId);
    if (cardToDelete) {
      // マルチセレクターの選択からも削除
      setSelectedServices(prev => prev.filter(service => service !== cardToDelete.service));
    }
    setServiceCards(prev => prev.filter(card => card.id !== cardId));
  }

  const handleCalculate = async (cardId: string) => {
    const card = serviceCards.find(c => c.id === cardId);
    if (!card) return;

    // 必須属性のチェック
    const requiredAttributes = Attributes[card.service as AttributeName];
    const missingAttributes = requiredAttributes.filter(attr => !card.attributes[attr]);
    
    if (missingAttributes.length > 0) {
      alert(`以下の項目を入力してください: ${missingAttributes.join(', ')}`);
      return;
    }

    const data = await fetchServiceCost(card.service, card.attributes);
    setServiceCards(cards => cards.map(c => 
      c.id === cardId ? { ...c, price: data.price, actualCost: data.actualCost } : c
    ));
  };

  const getOptionsForAttribute = (cardId: string, service: string, attribute: string) => {
    switch (service) {
      case 'AWSLambda':
        switch (attribute) {
          case 'memory':
            return LambdaOptions.memory;
          case 'duration':
            return LambdaOptions.duration;
          case 'requests':
            return LambdaOptions.requests;
          default:
            return specOptions[`${cardId}-${attribute}`] || [];
        }
      case 'AWSAmplify':
        switch (attribute) {
          case 'buildMinutes':
            return AmplifyOptions.buildMinutes;
          case 'storage':
            return AmplifyOptions.storage;
          case 'dataTranfer':
            return AmplifyOptions.dataTranfer;
          default:
            return specOptions[`${cardId}-${attribute}`] || [];
        }
      case 'AWSAppSync':
        switch (attribute) {
          case 'queries':
            return AppSyncOptions.queries;
          case 'subscriptionMinutes':
            return AppSyncOptions.subscriptionMinutes;
          case 'dataTransfer':
            return AppSyncOptions.dataTransfer;
          default:
            return specOptions[`${cardId}-${attribute}`] || [];
        }
      default:
        return specOptions[`${cardId}-${attribute}`] || [];
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          AWS Price Calculator
        </Typography>
        <Autocomplete
          multiple
          value={selectedServices}  // 値を制御
          options={services}
          loading={servicesLoading}
          onChange={handleServiceAdd}
          renderInput={(params) => (
            <TextField {...params} label="Add AWS Services" variant="outlined" />
          )}
          sx={{ width: '100%', mb: 3 }}
        />

        <Grid container spacing={2}>
          {serviceCards.map(card => (
            <Grid item xs={12} md={6} lg={4} key={card.id}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6">{card.service}</Typography>
                    <IconButton onClick={() => handleDeleteCard(card.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    handleCalculate(card.id);
                  }}>
                    <Grid container spacing={2}>
                      {Attributes[card.service as AttributeName]?.map((attribute) => (
                        <Grid item xs={12} key={`${card.id}-${attribute}`}>
                          <Autocomplete
                            loading={specsLoading[attribute]}
                            onChange={(event, newValue: Option | null) => {
                              handleAttributeChange(
                                card.id,
                                attribute,
                                newValue ? newValue.value : ''
                              )}
                            }
                            options={getOptionsForAttribute(card.id, card.service, attribute)}
                            getOptionLabel={(option: Option) => option.label}
                            renderInput={(params) => (
                              <TextField 
                                {...params} 
                                label={attribute} 
                                variant="outlined"
                                required
                              />
                            )}
                          />
                        </Grid>
                      ))}
                    </Grid>
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      fullWidth
                      startIcon={<CalculateIcon />}
                      sx={{ mt: 2 }}
                    >
                      価格を計算
                    </Button>
                  </form>
                  {costLoading ? (
                    <CircularProgress />
                  ) : (
                    <>
                      {card.price && (
                        <Typography sx={{ mt: 2 }} color="primary">
                          予想月額: ¥{card.price.toLocaleString()}
                        </Typography>
                      )}
                      {card.actualCost && (
                        <Typography sx={{ mt: 1 }} color="secondary">
                          前月の実績: ¥{parseInt(card.actualCost.lastMonth).toLocaleString()}
                        </Typography>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {serviceCards.length > 0 && (
          <Paper sx={{ p: 2, mt: 3 }}>
            <Typography variant="h5">
              合計予想月額: ¥{totalCost.toLocaleString()}
            </Typography>
          </Paper>
        )}
      </Box>
    </Container>
  );
}

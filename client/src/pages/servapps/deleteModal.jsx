import React from 'react';
import { Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, IconButton, LinearProgress, Stack, Tooltip, useMediaQuery } from '@mui/material';
import { ApiOutlined, CheckCircleOutlined, CloseSquareOutlined, ContainerOutlined, DatabaseOutlined, DeleteOutlined, LinkOutlined, PauseCircleOutlined, PlaySquareOutlined, ReloadOutlined, RollbackOutlined, StopOutlined, UpCircleOutlined } from '@ant-design/icons';
import * as API from '../../api';
import LogsInModal from '../../components/logsInModal';
import { DeleteButton } from '../../components/delete';
import { CosmosCheckbox } from '../config/users/formShortcuts';
import { getContainersRoutes } from '../../utils/routes';

const DeleteModal = ({Ids, containers, refreshServApps, setIsUpdatingId, config}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [failed, setFailed] = React.useState([]);
  const [deleted, setDeleted] = React.useState([]);
  const [ignored, setIgnored] = React.useState([]);
  const [isDeleting, setIsDeleting] = React.useState(false);

  containers = containers.map((container) => {
    if(container.Names) {
      container.Name = container.Names[0];
    }
    return container;
  });

  const ShowAction = ({item}) => {
    if(!isDeleting) {
      return <Checkbox checked={!ignored.includes(item)} size="large" id={item} onChange={(e) => {
        if(!e.target.checked) {
          setIgnored((prev) => {
            if(!prev) return [item];
            else return [...prev, item];
          });
        } else {
          setIgnored((prev) => {
            if(!prev) return [];
            else return prev.filter((i) => i !== item);
          });
        }
      }} />
    }

    if(failed.includes(item)) {
      return "❌"
    } else if(deleted.includes(item)) {
      return "✔️"
    } else {
      return <CircularProgress size={18} />
    }
  }

  let networks = isOpen && containers.map((container) => {
    return Object.keys(container.NetworkSettings.Networks);
  }).flat().filter((network, index, self) => {
    return self.indexOf(network) === index;
  }).filter((network) => {
    return network !== 'bridge' && network !== 'host' && network !== 'none' && network !== 'default';
  });
  
  let volumes = isOpen && containers.map((container) => {
    return container.Mounts.filter((mount) => {
      return mount.Type === 'volume'
    }).map((mount) => {
      return mount.Name 
    })
  }).flat().filter((volume, index, self) => {
    return self.indexOf(volume) === index;
  });

  let routes = isOpen && containers.map((container) => {
    return getContainersRoutes(config, container.Name.replace('/', ''));
  }).flat().map((route) => {
    return route.Name;
  }).filter((route, index, self) => {
    return self.indexOf(route) === index;
  });

  console.log(routes);

  const doDelete = () => {
    setIsDeleting(true);

    const promises = [];

    promises.concat(
      containers.map((container) => {
        let key = container.Name + '-container';
        if (ignored.includes(key)) return;

        return API.docker.manageContainer(container.Name, 'remove')
        .then(() => {
          setDeleted((prev) => {
            if(!prev) return [key];
            else return [...prev, key];
          });
        })
        .catch((err) => {
          setFailed((prev) => {
            if(!prev) return [key];
            else return [...prev, key];
          });
        });
      })
    );
    Promise.all(promises)
    .then(() => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve();
        }, 1000);
      });
    })
    .then(() => {
      const promises2 = [];
      
      promises2.concat(
        networks.map((network) => {
          let key = network + '-network';
          if (ignored.includes(key)) return;
  
          return API.docker.networkDelete(network)
          .then(() => {
            setDeleted((prev) => {
              if(!prev) return [key];
              else return [...prev, key];
            });
          })
          .catch((err) => {
            setFailed((prev) => {
              if(!prev) return [key];
              else return [...prev, key];
            });
          });
        })
      );
  
      promises2.concat(
        volumes.map((volume) => {
          let key = volume + '-volume';
          if (ignored.includes(key)) return;
  
          return API.docker.volumeDelete(volume)
          .then(() => {
            setDeleted((prev) => {
              if(!prev) return [key];
              else return [...prev, key];
            });
          })
          .catch((err) => {
            setFailed((prev) => {
              if(!prev) return [key];
              else return [...prev, key];
            });
          });
        })
      );  

      promises2.concat(
        routes.map((route) => {
          let key = route + '-route';
          if (ignored.includes(key)) return;
  
          return API.config.deleteRoute(route)
          .then(() => {
            setDeleted((prev) => {
              if(!prev) return [key];
              else return [...prev, key];
            });
          })
          .catch((err) => {
            setFailed((prev) => {
              if(!prev) return [key];
              else return [...prev, key];
            });
          });
        })
      );


      return Promise.all(promises2);
    })
  }

  return <>
     {isOpen && <>
        <Dialog open={isOpen} onClose={() => {refreshServApps() ; setIsOpen(false)}}>
            <DialogTitle>Delete Service</DialogTitle>
            <DialogContent>
                <DialogContentText>
                  <Stack spacing={1}>
                    <div>
                      {isDeleting && <div>
                        Deletion status:
                      </div>}
                      {!isDeleting && <div>
                        Select what you wish to delete:
                      </div>}
                    </div>
                    {containers.map((container) => {
                      return (!isDeleting || (!ignored.includes(container.Name + "-container"))) && <div key={container.Name + "-container"}>
                        <ShowAction item={container.Name + "-container"} /> <ContainerOutlined /> Container {container.Name}
                      </div>
                    })}
                    {networks.map((network) => {
                      return  (!isDeleting || (!ignored.includes(network + "-network"))) &&<div key={network + "-network"}>
                        <ShowAction item={network + "-network"} /> <ApiOutlined /> Network {network}
                      </div>
                    })}
                    {volumes.map((mount) => {
                      return  (!isDeleting || (!ignored.includes(mount + "-volume"))) && <div key={mount + "-volume"}> 
                        <ShowAction item={mount + "-volume"} /> <DatabaseOutlined /> Volume {mount}
                      </div>
                    })}
                    {routes.map((route) => {
                      return  (!isDeleting || (!ignored.includes(route + "-route"))) && <div key={route + "-route"}> 
                        <ShowAction item={route + "-route"} /> <LinkOutlined /> Route {route}
                      </div>
                    })}
                  </Stack>
                </DialogContentText>
            </DialogContent>
            {!isDeleting && <DialogActions>
                <Button onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button onClick={() => {
                  doDelete();
                }}>Delete</Button>
            </DialogActions>}
            {isDeleting && <DialogActions>
                <Button onClick={() => {
                  refreshServApps();
                  setIsOpen(false);
                }}>Done</Button>
            </DialogActions>}
        </Dialog>
     </>}

     <IconButton onClick={() => {
          setIsOpen(true);
          setIsDeleting(false);
          setFailed([]);
          setDeleted([]);
          setIgnored([]);
      }} color="error" size='large'>
        <DeleteOutlined />
      </IconButton>
  </>
}

export default DeleteModal;